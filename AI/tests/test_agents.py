import pytest
import asyncio
from ai_service.agents.planner_agent import PlannerAgent
from ai_service.agents.route_agent import RouteAgent
from ai_service.agents.stay_agent import StayAgent
from ai_service.agents.food_agent import FoodAgent
from ai_service.agents.transport_agent import TransportAgent
from ai_service.agents.budget_agent import BudgetAgent
from ai_service.agents.weather_agent import WeatherAgent
from ai_service.agents.companion_agent import CompanionAgent
from ai_service.agents.critic_agent import CriticAgent
from ai_service.agents.writer_agent import WriterAgent
from ai_service.schemas.domain import TripRequest, WorkflowState, AgentResult
from ai_service.services.providers.mock_provider import MockProvider
from ai_service.services.llm_service import llm_service
from ai_service.config.settings import settings

agents_list = [
    PlannerAgent,
    RouteAgent,
    StayAgent,
    FoodAgent,
    TransportAgent,
    BudgetAgent,
    WeatherAgent,
    CompanionAgent,
    CriticAgent,
    WriterAgent
]

@pytest.fixture
def base_state():
    trip_req = TripRequest(
        destination="Delhi",
        startDate="2026-06-21",
        endDate="2026-06-22",
        totalBudget=4000.0
    )
    return WorkflowState(
        tripId="123",
        tripDetails=trip_req,
        chatHistory=[],
        activities=[]
    )

@pytest.mark.anyio
async def test_all_agents_input_output_validation(base_state):
    for agent_class in agents_list:
        agent = agent_class()
        assert isinstance(agent.validate_input(base_state), bool)
        result = await agent.run(base_state)
        assert isinstance(result, AgentResult)
        assert result.agentName == agent.name
        assert agent.validate_output(result) is True

@pytest.mark.anyio
async def test_agent_failure_recovery_returns_safe_result(base_state):
    class FaultyAgent(PlannerAgent):
        async def _execute_logic(self, state: WorkflowState):
            raise RuntimeError("Simulated agent runtime error")

    agent = FaultyAgent()
    result = await agent.run(base_state)
    assert isinstance(result, AgentResult)
    assert result.action == "ErrorRecovery"
    assert "Simulated agent runtime error" in result.reasoning
    assert result.details["error"] == "Simulated agent runtime error"

@pytest.mark.anyio
async def test_mock_provider_works():
    provider = MockProvider()
    response = await provider.generate("Test prompt")
    assert response == "Mock Provider Response Text"
    assert provider.validate_response(response) is True
    assert provider.estimate_tokens(response) > 0

@pytest.mark.anyio
async def test_llm_service_fallback_routing():
    old_provider = settings.llm_provider
    settings.llm_provider = "invalid_provider_name"
    try:
        response = await llm_service.generate_response(prompt="Hello", retries=1)
        assert response == "Mock Provider Response Text"
    finally:
        settings.llm_provider = old_provider

@pytest.mark.anyio
async def test_llm_service_timeout_handling():
    class SlowProvider(MockProvider):
        async def generate(self, prompt: str, system_instruction: str | None = None, **kwargs) -> str:
            await asyncio.sleep(5.0)
            return "Slow Response"

    slow_p = SlowProvider()
    llm_service.providers["slow"] = slow_p
    old_provider = settings.llm_provider
    settings.llm_provider = "slow"
    
    try:
        response = await llm_service.generate_response(prompt="Hello", retries=1, timeout=0.1)
        assert response == "Mock Provider Response Text"
    finally:
        settings.llm_provider = old_provider
        if "slow" in llm_service.providers:
            del llm_service.providers["slow"]
