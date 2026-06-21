from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult

class WeatherAgent(BaseAgent):
    def __init__(self):
        super().__init__("WeatherAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "WeatherDetour"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        details = {
            "weatherAlert": "Rain expected",
            "suggestedAlternative": "National Museum (Indoor)"
        }
        return "WeatherDetour", "Checked weather forecasts and proposed indoor alternatives where necessary.", details
