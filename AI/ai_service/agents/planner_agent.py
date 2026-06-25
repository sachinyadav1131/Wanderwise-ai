"""
PlannerAgent — refactored for Phase 7.
Queries the MCP server's `find_places` tool to build the high-level trip structure,
then calls `save_itinerary` to persist the plan and `store_agent_log` for audit.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__("PlannerAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "PlanTripStructure"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        # Compute number of days
        from datetime import datetime
        try:
            start = datetime.fromisoformat(trip.startDate)
            end = datetime.fromisoformat(trip.endDate)
            total_days = max((end - start).days, 1)
        except ValueError:
            total_days = 1

        # ── MCP Tool Call: find_places (attractions) for day summaries ────
        places_result = await mcp_client.call_tool("find_places", {
            "destination": trip.destination,
            "category": "attraction",
            "interests": trip.interests,
        })
        places = places_result.get("places", [])

        # Build one high-level day plan per day
        high_level_plan = []
        for day_num in range(1, total_days + 1):
            # Pick a different attraction per day (cycle if fewer places than days)
            primary_place = places[(day_num - 1) % len(places)] if places else None
            high_level_plan.append({
                "dayNumber": day_num,
                "date": trip.startDate,  # Simplified; full date math done in WriterAgent
                "summary": (
                    f"Day {day_num}: {primary_place['name'] if primary_place else 'Explore'} "
                    f"& highlights of {trip.destination}"
                ),
                "primaryAttraction": primary_place["name"] if primary_place else None,
                "staySuggestion": None,  # Filled by StayAgent
            })

        # ── MCP Tool Call: save_itinerary ────────────────────────────────
        await mcp_client.call_tool("save_itinerary", {
            "trip_id": state.tripId,
            "days": high_level_plan,
            "metadata": {
                "destination": trip.destination,
                "startDate": trip.startDate,
                "endDate": trip.endDate,
                "totalBudget": trip.totalBudget,
                "travelers": trip.travelers,
            },
        })

        reasoning = (
            f"Generated {total_days}-day high-level structure for '{trip.destination}' "
            f"using MCP find_places (interests: {trip.interests or ['general']}). "
            f"Saved plan to MCP save_itinerary."
        )

        details = {"highLevelPlan": high_level_plan}

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "PlanTripStructure",
            "reasoning": reasoning,
            "details": details,
        })

        return "PlanTripStructure", reasoning, details
