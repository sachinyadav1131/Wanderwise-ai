from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class BudgetAgent(BaseAgent):
    def __init__(self):
        super().__init__("BudgetAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "CalculateBudget"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "budgetBreakdown": {
                "stay": 950.0,
                "food": 300.0,
                "transport": 50.0,
                "activities": 0.0,
                "total": 1300.0
            }
        }
        return "CalculateBudget", "Compiled itemized expenses and estimated total budget impact.", details
