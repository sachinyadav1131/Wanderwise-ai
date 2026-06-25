"""
RouteAgent — refactored for Phase 7.
Queries the MCP server's `find_places` and `calculate_distance` tools
instead of returning hardcoded activity lists.
Also calls `store_agent_log` to record its routing rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class RouteAgent(BaseAgent):
    def __init__(self):
        super().__init__("RouteAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "OptimizeRoutes"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        # ── MCP Tool Call: find_places (attractions) ─────────────────────
        places_result = await mcp_client.call_tool("find_places", {
            "destination": trip.destination,
            "category": "attraction",
            "interests": trip.interests,
        })

        places = places_result.get("places", [])

        # Build activity list from top 3 attractions
        activities = []
        time_slots = ["Morning", "Afternoon", "Evening"]
        start_times = ["09:00 AM", "01:00 PM", "05:00 PM"]

        top_places = places[:3] if places else []
        for i, place in enumerate(top_places):
            activities.append({
                "title": f"Visit {place['name']}",
                "timeSlot": time_slots[i % len(time_slots)],
                "time": start_times[i % len(start_times)],
                "location": place["location"],
                "cost": place.get("entry_fee", 0),
                "estimatedDuration": place.get("avg_duration_minutes", 60),
                "tags": place.get("tags", []),
                "isIndoor": place.get("is_indoor", False),
            })

        # ── MCP Tool Call: calculate_distance between first two stops ─────
        distance_info = {}
        if len(top_places) >= 2:
            dist_result = await mcp_client.call_tool("calculate_distance", {
                "origin": top_places[0]["name"],
                "destination": top_places[1]["name"],
                "mode": "metro",
            })
            distance_info = {
                "firstLegDistance": dist_result.get("distance_km"),
                "firstLegDurationMinutes": dist_result.get("duration_minutes"),
                "firstLegCost": dist_result.get("estimated_cost"),
                "mode": dist_result.get("mode"),
            }

        reasoning = (
            f"Queried MCP find_places for '{trip.destination}' attractions "
            f"(interests: {trip.interests or ['general']}). "
            f"Sequenced {len(activities)} locations and computed route distances via MCP."
        )

        details = {
            "activities": activities,
            "routeSummary": distance_info,
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "OptimizeRoutes",
            "reasoning": reasoning,
            "details": details,
        })

        return "OptimizeRoutes", reasoning, details
