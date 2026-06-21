from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class FoodAgent(BaseAgent):
    def __init__(self):
        super().__init__("FoodAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RecommendFood"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "foodSuggestions": [
                {
                    "mealType": "Lunch",
                    "restaurantName": "Khan Chacha",
                    "cuisineType": "Mughlai",
                    "averagePrice": 300
                }
            ]
        }
        return "RecommendFood", "Selected nearby budget-friendly dining options matching preference.", details
