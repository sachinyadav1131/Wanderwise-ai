import pytest
from ai_service.workflows.trip_overview_workflow import TripOverviewWorkflow
from ai_service.workflows.detailed_itinerary_workflow import DetailedItineraryWorkflow
from ai_service.workflows.chat_workflow import ChatWorkflow
from ai_service.workflows.replan_workflow import ReplanWorkflow
from ai_service.schemas.domain import TripRequest, WorkflowState

@pytest.mark.anyio
async def test_trip_overview_workflow_e2e():
    wf = TripOverviewWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(trip_id="123", trip_details=trip_req)
    final_state = await wf.execute(state)
    assert final_state.context["output"]["destination"] == "Delhi"
    assert "highLevelPlan" in final_state.context["output"]

@pytest.mark.anyio
async def test_detailed_itinerary_workflow_e2e():
    wf = DetailedItineraryWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(trip_id="123", trip_details=trip_req)
    final_state = await wf.execute(state)
    assert len(final_state.context["output"]["itineraryDays"]) > 0

@pytest.mark.anyio
async def test_chat_workflow_e2e_weather():
    wf = ChatWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(
        trip_id="123",
        trip_details=trip_req,
        context={"message": "Is it going to rain today?"}
    )
    final_state = await wf.execute(state)
    out = final_state.context["output"]
    assert out["hasSuggestion"] is True
    assert out["suggestion"]["triggerType"] == "Weather"

@pytest.mark.anyio
async def test_chat_workflow_e2e_normal():
    wf = ChatWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(
        trip_id="123",
        trip_details=trip_req,
        context={"message": "Hello, how are you?"}
    )
    final_state = await wf.execute(state)
    out = final_state.context["output"]
    assert out["hasSuggestion"] is False
    assert "guide" in out["replyText"]

@pytest.mark.anyio
async def test_replan_workflow_e2e():
    wf = ReplanWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(
        trip_id="123",
        trip_details=trip_req,
        context={"triggerType": "Weather", "reason": "Heavy precipitation"}
    )
    final_state = await wf.execute(state)
    out = final_state.context["output"]
    assert out["estimatedBudgetImpact"] == 0.0
    assert "detour to Crafts Museum" in out["generatedSummary"]

@pytest.mark.anyio
async def test_workflow_error_recovery():
    # Construct a subclass with a failing stage to check hook execution
    class FailingWorkflow(TripOverviewWorkflow):
        def __init__(self):
            super().__init__()
            self.stages = ["collect_context", "fail_stage"]
            
        async def stage_fail_stage(self, state: WorkflowState) -> WorkflowState:
            raise RuntimeError("Simulated failure in stage")
            
    wf = FailingWorkflow()
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    state = wf.initialize_state(trip_id="123", trip_details=trip_req)
    final_state = await wf.execute(state)
    
    assert "errors" in final_state.context
    assert "fail_stage" in final_state.context["errors"]
    assert "Simulated failure in stage" in final_state.context["errors"]["fail_stage"]
