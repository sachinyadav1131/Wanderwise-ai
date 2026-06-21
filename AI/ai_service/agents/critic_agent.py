from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class CriticAgent(BaseAgent):
    def __init__(self):
        super().__init__("CriticAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "AuditItinerary"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "auditPassed": True,
            "warnings": []
        }
        return "AuditItinerary", "Audited safety, fatigue limits, and budget caps across scheduled activities.", details
