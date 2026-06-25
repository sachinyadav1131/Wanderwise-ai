"""
WeatherAgent — refactored for Phase 7.
Queries the MCP server's `check_weather` tool instead of returning hardcoded data.
Also calls `store_agent_log` to record its decision rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class WeatherAgent(BaseAgent):
    def __init__(self):
        super().__init__("WeatherAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "WeatherDetour"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        destination = state.tripDetails.destination
        start_date = state.tripDetails.startDate

        # ── MCP Tool Call: check_weather ─────────────────────────────────
        weather = await mcp_client.call_tool("check_weather", {
            "location": destination,
            "date": start_date,
        })

        # Determine if a weather detour is warranted (>50% rain probability)
        needs_detour = weather.get("precipitation_pct", 0) > 50
        condition = weather.get("condition", "Unknown")
        advisory = weather.get("advisory") or "No advisory."

        if needs_detour:
            suggested_alternative = "National Museum (Indoor)"
            reasoning = (
                f"Weather check via MCP: {condition} with "
                f"{weather['precipitation_pct']}% precipitation at {destination}. "
                f"Advisory: {advisory}. Proposing indoor alternative."
            )
        else:
            suggested_alternative = None
            reasoning = (
                f"Weather check via MCP: {condition} conditions at {destination}. "
                f"No detour required."
            )

        details = {
            "weatherCheck": weather,
            "weatherAlert": condition if needs_detour else None,
            "suggestedAlternative": suggested_alternative,
            "needsDetour": needs_detour,
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "WeatherDetour",
            "reasoning": reasoning,
            "details": details,
        })

        return "WeatherDetour", reasoning, details
