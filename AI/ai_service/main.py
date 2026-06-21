from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from typing import Any, Optional
import datetime

from ai_service.config.settings import settings
from ai_service.utils.logging import CorrelationIdLoggingMiddleware, logger
from ai_service.schemas.domain import TripRequest, WorkflowState, ChangeProposal, APIResponse

# 1. Instantiate FastAPI app with custom OpenAPI Metadata
app = FastAPI(
    title="Wanderwise AI Service",
    description="Multi-Agent Adaptive Trip Planner AI reasoning microservice.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# 2. Add structured Logging & Correlation ID Middleware
app.add_middleware(CorrelationIdLoggingMiddleware)

# 3. Register Global Exception Handlers returning standard APIResponse structures
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation failed: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Input validation failed.",
            "data": exc.errors()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal Server Error",
            "data": {"error": str(exc)}
        }
    )

# 4. Health probes with extended mock status indicators
@app.get("/health", response_model=APIResponse[dict])
@app.get("/api/v1/ai/health", response_model=APIResponse[dict])
async def health_check():
    dependencies_status = {
        "database": "up",
        "llm_provider": "up",
        "mcp_server": "up"
    }
    return APIResponse(
        success=True,
        message="Wanderwise AI Microservice health check passed.",
        data={
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            "dependencies": dependencies_status
        }
    )

# 5. Core AI Route Implementations
from ai_service.workflows.trip_overview_workflow import TripOverviewWorkflow
from ai_service.workflows.detailed_itinerary_workflow import DetailedItineraryWorkflow
from ai_service.workflows.chat_workflow import ChatWorkflow
from ai_service.workflows.replan_workflow import ReplanWorkflow

trip_overview = TripOverviewWorkflow()
detailed_itinerary = DetailedItineraryWorkflow()
chat_work = ChatWorkflow()
replan_work = ReplanWorkflow()

@app.post("/api/v1/ai/trip-overview", response_model=APIResponse[dict])
async def generate_trip_overview(request: TripRequest):
    logger.info("Executing Trip Overview workflow")
    res = await trip_overview.run(request)
    return APIResponse(
        success=True,
        message="Trip overview generated successfully.",
        data=res
    )

@app.post("/api/v1/ai/detailed-itinerary", response_model=APIResponse[dict])
async def generate_detailed_itinerary(request: TripRequest):
    logger.info("Executing Detailed Itinerary workflow")
    res = await detailed_itinerary.run(request)
    return APIResponse(
        success=True,
        message="Detailed itinerary generated successfully.",
        data=res
    )

class ChatPayload(BaseModel):
    tripId: str
    message: str
    chatHistory: list[dict] = Field(default_factory=list)
    activities: list[dict] = Field(default_factory=list)
    currentProgress: float = 0.0

@app.post("/api/v1/ai/chat", response_model=APIResponse[dict])
async def chat_message(payload: ChatPayload):
    logger.info(f"Executing Chat workflow for trip: {payload.tripId}")
    state = WorkflowState(
        tripId=payload.tripId,
        tripDetails=TripRequest(
            destination="Delhi",
            startDate="2026-06-21",
            endDate="2026-06-22",
            totalBudget=4000.0
        ),
        chatHistory=payload.chatHistory,
        activities=payload.activities,
        currentProgress=payload.currentProgress
    )
    res = await chat_work.run(state, payload.message)
    return APIResponse(
        success=True,
        message="Chat response processed.",
        data=res
    )

class ReplanPayload(BaseModel):
    tripId: str
    triggerType: str
    reason: str
    activities: list[dict] = Field(default_factory=list)
    weatherAlertDetails: Optional[dict] = None

@app.post("/api/v1/ai/replan", response_model=APIResponse[dict])
async def replan_trip(payload: ReplanPayload):
    logger.info(f"Executing Replan workflow triggered by: {payload.triggerType}")
    res = await replan_work.run(
        trip_id=payload.tripId,
        trigger_type=payload.triggerType,
        reason=payload.reason,
        activities=payload.activities,
        weather_alert_details=payload.weatherAlertDetails
    )
    return APIResponse(
        success=True,
        message="Replan suggestion proposal generated.",
        data=res
    )
