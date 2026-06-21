from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("PlannerAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "PlanTripStructure"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "highLevelPlan": [
                {
                    "dayNumber": 1,
                    "summary": f"Day 1: Highlights of {state.tripDetails.destination}",
                    "staySuggestion": "Smyle Inn Hostel"
                }
            ]
        }
        return "PlanTripStructure", f"Generated high-level trip structure for {state.tripDetails.destination}", details
