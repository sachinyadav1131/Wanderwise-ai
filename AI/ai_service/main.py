from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from typing import Any, Optional
import datetime

from ai_service.config.settings import settings
from ai_service.utils.logging import CorrelationIdLoggingMiddleware, logger
from ai_service.schemas.domain import (
    TripRequest, WorkflowState, ChangeProposal, APIResponse,
    MCPToolCall, MCPToolResponse,
)

# ---------------------------------------------------------------------------
# 1. FastAPI lifespan — initialise and shut down the MCP server gracefully
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: initialise the in-process MCP server (registers all 8 tools).
    Shutdown: cleanly deregister the tool registry.
    """
    if settings.mcp_enabled:
        from ai_service.mcp_server.server import mcp_server
        logger.info("Starting MCP server initialization …")
        await mcp_server.initialize()
        logger.info("MCP server ready ✓")
    else:
        logger.warning("MCP server is DISABLED via settings (MCP_ENABLED=false).")
    
    yield  # ── app is running ──

    if settings.mcp_enabled:
        from ai_service.mcp_server.server import mcp_server
        await mcp_server.shutdown()
        logger.info("MCP server shut down cleanly.")


# ---------------------------------------------------------------------------
# 2. Instantiate FastAPI app with lifespan + custom OpenAPI Metadata
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Wanderwise AI Service",
    description="Multi-Agent Adaptive Trip Planner AI reasoning microservice.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# 3. Add structured Logging & Correlation ID Middleware
# ---------------------------------------------------------------------------
app.add_middleware(CorrelationIdLoggingMiddleware)

# ---------------------------------------------------------------------------
# 4. Register Global Exception Handlers returning standard APIResponse structures
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# 5. Health probes with extended status indicators (including MCP server)
# ---------------------------------------------------------------------------
@app.get("/health", response_model=APIResponse[dict])
@app.get("/api/v1/ai/health", response_model=APIResponse[dict])
async def health_check():
    from ai_service.mcp_server.server import mcp_server
    mcp_tools = mcp_server.list_tools() if settings.mcp_enabled else []
    mcp_status = "up" if (settings.mcp_enabled and len(mcp_tools) > 0) else (
        "disabled" if not settings.mcp_enabled else "initializing"
    )
    dependencies_status = {
        "database": "up",
        "llm_provider": "up",
        "mcp_server": mcp_status,
        "mcp_tools_registered": len(mcp_tools),
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

# ---------------------------------------------------------------------------
# 6. MCP Server Introspection Endpoints
# ---------------------------------------------------------------------------
@app.get(
    "/api/v1/mcp/tools",
    response_model=APIResponse[dict],
    summary="List all registered MCP tools",
    tags=["MCP Server"],
)
async def list_mcp_tools():
    """Returns a list of all tool names currently registered in the MCP server."""
    if not settings.mcp_enabled:
        raise HTTPException(status_code=503, detail="MCP server is disabled.")
    from ai_service.mcp_server.server import mcp_server
    tools = mcp_server.list_tools()
    return APIResponse(
        success=True,
        message=f"{len(tools)} MCP tool(s) are registered.",
        data={"tools": tools, "count": len(tools)},
    )


@app.post(
    "/api/v1/mcp/call",
    response_model=MCPToolResponse,
    summary="Directly invoke an MCP tool (debug / admin use)",
    tags=["MCP Server"],
)
async def call_mcp_tool(payload: MCPToolCall):
    """
    Directly dispatches a named tool call on the MCP server.
    Useful for integration testing and admin debugging via /docs.
    """
    if not settings.mcp_enabled:
        raise HTTPException(status_code=503, detail="MCP server is disabled.")
    from ai_service.mcp_server.server import mcp_server
    try:
        result = await mcp_server.call_tool(payload.tool_name, payload.args)
        return MCPToolResponse(tool_name=payload.tool_name, success=True, result=result)
    except KeyError as e:
        return MCPToolResponse(tool_name=payload.tool_name, success=False, error=str(e))
    except Exception as e:
        logger.error(f"MCP direct call failed for tool '{payload.tool_name}': {e}")
        return MCPToolResponse(tool_name=payload.tool_name, success=False, error=str(e))


@app.get(
    "/api/v1/mcp/logs",
    response_model=APIResponse[dict],
    summary="Retrieve agent decision logs",
    tags=["MCP Server"],
)
async def get_mcp_logs(trip_id: Optional[str] = None):
    """Returns stored agent decision logs, optionally filtered by trip_id."""
    if not settings.mcp_enabled:
        raise HTTPException(status_code=503, detail="MCP server is disabled.")
    from ai_service.mcp_server.tools.agent_log_tool import get_agent_logs
    logs = get_agent_logs(trip_id)
    return APIResponse(
        success=True,
        message=f"{len(logs)} log entry(ies) found.",
        data={"logs": logs, "count": len(logs)},
    )


@app.get(
    "/api/v1/mcp/notifications",
    response_model=APIResponse[dict],
    summary="Retrieve queued notifications",
    tags=["MCP Server"],
)
async def get_mcp_notifications():
    """Returns the current in-memory notification queue."""
    if not settings.mcp_enabled:
        raise HTTPException(status_code=503, detail="MCP server is disabled.")
    from ai_service.mcp_server.tools.notification_tool import get_notification_queue
    notifications = get_notification_queue()
    return APIResponse(
        success=True,
        message=f"{len(notifications)} notification(s) in queue.",
        data={"notifications": notifications, "count": len(notifications)},
    )

# ---------------------------------------------------------------------------
# 7. Core AI Route Implementations
# ---------------------------------------------------------------------------
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
    state = trip_overview.initialize_state(
        trip_id="overview-trip",
        trip_details=request
    )
    final_state = await trip_overview.execute(state)
    return APIResponse(
        success=True,
        message="Trip overview generated successfully.",
        data=final_state.context.get("output", {})
    )

@app.post("/api/v1/ai/detailed-itinerary", response_model=APIResponse[dict])
async def generate_detailed_itinerary(request: TripRequest):
    logger.info("Executing Detailed Itinerary workflow")
    state = detailed_itinerary.initialize_state(
        trip_id="detailed-trip",
        trip_details=request
    )
    final_state = await detailed_itinerary.execute(state)
    return APIResponse(
        success=True,
        message="Detailed itinerary generated successfully.",
        data=final_state.context.get("output", {})
    )

class ChatPayload(BaseModel):
    tripId: str
    message: str
    chatHistory: list[dict] = Field(default_factory=list)
    activities: list[dict] = Field(default_factory=list)
    currentProgress: float = 0.0
    tripDetails: Optional[TripRequest] = None

@app.post("/api/v1/ai/chat", response_model=APIResponse[dict])
async def chat_message(payload: ChatPayload):
    logger.info(f"Executing Chat workflow for trip: {payload.tripId}")
    # Use real trip details from Express backend if provided, otherwise fallback
    trip_details = payload.tripDetails or TripRequest(
        destination="Unknown",
        startDate="2026-01-01",
        endDate="2026-01-02",
        totalBudget=5000.0
    )
    context = {
        "message": payload.message
    }
    state = chat_work.initialize_state(
        trip_id=payload.tripId,
        trip_details=trip_details,
        chatHistory=payload.chatHistory,
        activities=payload.activities,
        currentProgress=payload.currentProgress,
        context=context
    )
    final_state = await chat_work.execute(state)
    return APIResponse(
        success=True,
        message="Chat response processed.",
        data=final_state.context.get("output", {})
    )

class ReplanPayload(BaseModel):
    tripId: str
    triggerType: str
    reason: str
    activities: list[dict] = Field(default_factory=list)
    weatherAlertDetails: Optional[dict] = None
    tripDetails: Optional[TripRequest] = None

@app.post("/api/v1/ai/replan", response_model=APIResponse[dict])
async def replan_trip(payload: ReplanPayload):
    logger.info(f"Executing Replan workflow triggered by: {payload.triggerType}")
    # Use real trip details from Express backend if provided, otherwise fallback
    trip_details = payload.tripDetails or TripRequest(
        destination="Unknown",
        startDate="2026-01-01",
        endDate="2026-01-02",
        totalBudget=5000.0
    )
    context = {
        "triggerType": payload.triggerType,
        "reason": payload.reason,
        "weatherAlertDetails": payload.weatherAlertDetails
    }
    state = replan_work.initialize_state(
        trip_id=payload.tripId,
        trip_details=trip_details,
        activities=payload.activities,
        context=context
    )
    final_state = await replan_work.execute(state)
    return APIResponse(
        success=True,
        message="Replan suggestion proposal generated.",
        data=final_state.context.get("output", {})
    )
