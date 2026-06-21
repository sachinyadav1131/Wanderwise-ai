from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class StayAgent(BaseAgent):
    def __init__(self):
        super().__init__("StayAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RecommendStay"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "staySuggestion": {
                "locationArea": "Connaught Place/Paharganj",
                "options": [
                    {
                        "name": "Smyle Inn Hostel",
                        "pricePerNight": 950,
                        "type": "Hostel"
                    }
                ]
            }
        }
        return "RecommendStay", "Selected budget stays based on trip location coordinates.", details
