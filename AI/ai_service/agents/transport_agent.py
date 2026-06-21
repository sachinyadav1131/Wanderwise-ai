from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class TransportAgent(BaseAgent):
    def __init__(self):
        super().__init__("TransportAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RouteTransport"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "transport": {
                "mode": "Metro",
                "estimatedCost": 50,
                "durationMinutes": 20
            }
        }
        return "RouteTransport", "Calculated optimal transport transit options between activities.", details
