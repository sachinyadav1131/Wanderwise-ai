from fastapi.testclient import TestClient
import pytest
from ai_service.main import app
from ai_service.services.llm_service import llm_service
from ai_service.config.settings import settings
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.workflows.trip_overview_workflow import TripOverviewWorkflow

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "healthy"
    assert "dependencies" in data["data"]

def test_trip_overview():
    payload = {
        "destination": "Delhi",
        "startDate": "2026-06-21",
        "endDate": "2026-06-22",
        "totalBudget": 4000.0
    }
    response = client.post("/api/v1/ai/trip-overview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["destination"] == "Delhi"

def test_detailed_itinerary():
    payload = {
        "tripId": "123",
        "destination": "Delhi",
        "startDate": "2026-06-21",
        "endDate": "2026-06-22",
        "totalBudget": 4000.0
    }
    response = client.post("/api/v1/ai/detailed-itinerary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["itineraryDays"]) > 0

def test_chat():
    payload = {
        "tripId": "123",
        "message": "It is going to rain today.",
        "chatHistory": [],
        "activities": [],
        "currentProgress": 0.0
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["hasSuggestion"] is True
    assert data["data"]["suggestion"]["triggerType"] == "Weather"

def test_replan():
    payload = {
        "tripId": "123",
        "triggerType": "Weather",
        "reason": "Severe rain alert",
        "activities": []
    }
    response = client.post("/api/v1/ai/replan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["estimatedBudgetImpact"] == 0.0

@pytest.mark.anyio
async def test_llm_service_fallback():
    # Force settings provider to a non-existent one to trigger fallback to mock
    old_provider = settings.llm_provider
    settings.llm_provider = "invalid_provider"
    try:
        response = await llm_service.generate_response(prompt="Hello", retries=1, timeout=2.0)
        assert response == "Mock Provider Response Text"
    finally:
        settings.llm_provider = old_provider

@pytest.mark.anyio
async def test_agent_execution_direct():
    agent = PlannerAgent()
    workflow = TripOverviewWorkflow()
    state = workflow.initialize_state(
        trip_id="test-trip-agent",
        trip_details={
            "destination": "Delhi",
            "startDate": "2026-06-21",
            "endDate": "2026-06-22",
            "totalBudget": 4000.0
        }
    )
    result = await agent.run(state)
    assert result.action == "PlanTripStructure"
    assert "highLevelPlan" in result.details

@pytest.mark.anyio
async def test_workflow_execution_direct():
    workflow = TripOverviewWorkflow()
    state = workflow.initialize_state(
        trip_id="test-trip-workflow",
        trip_details={
            "destination": "Delhi",
            "startDate": "2026-06-21",
            "endDate": "2026-06-22",
            "totalBudget": 4000.0
        }
    )
    assert state.trace_id != "SYSTEM"
    final_state = await workflow.execute(state)
    assert "output" in final_state.context
    assert final_state.context["output"]["destination"] == "Delhi"

