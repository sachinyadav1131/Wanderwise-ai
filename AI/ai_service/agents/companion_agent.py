from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class CompanionAgent(BaseAgent):
    def __init__(self):
        super().__init__("CompanionAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "ChatResponse"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "replyText": "I am here to guide your trip! Tell me about weather changes, or ask to skip/reschedule any destinations.",
            "hasSuggestion": False,
            "suggestion": None
        }
        return "ChatResponse", "Processed messaging and determined user intent.", details
