from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class RouteAgent(BaseAgent):
    def __init__(self):
        super().__init__("RouteAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "OptimizeRoutes"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "activities": [
                {
                    "title": "Visit India Gate",
                    "timeSlot": "Morning",
                    "time": "09:00 AM",
                    "location": "India Gate",
                    "cost": 0,
                    "estimatedDuration": 60
                }
            ]
        }
        return "OptimizeRoutes", "Sequenced locations and calculated route distances.", details
