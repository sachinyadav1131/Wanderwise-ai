from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class WriterAgent(BaseAgent):
    def __init__(self):
        super().__init__("WriterAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "FormatPayload"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "formatted": True
        }
        return "FormatPayload", "Formatted final execution artifacts to target frontend formats.", details
