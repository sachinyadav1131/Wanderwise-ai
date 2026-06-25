"""
TransportAgent — refactored for Phase 7.
Queries the MCP server's `calculate_distance` tool for transit estimates
between key trip checkpoints instead of returning hardcoded values.
Also calls `store_agent_log` to record its routing rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class TransportAgent(BaseAgent):
    def __init__(self):
        super().__init__("TransportAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RouteTransport"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        # Extract activities from RouteAgent output (if available in context)
        route_result = state.context.get("route_result") or {}
        activities = route_result.get("activities", [])

        transport_legs = []

        # Determine optimal mode based on budget tier
        budget_per_day = trip.totalBudget / max(1, trip.travelers)
        mode = "metro" if budget_per_day < 3000 else "auto"

        # Calculate distances between consecutive activity locations
        locations = [a["location"] for a in activities if "location" in a]

        for i in range(len(locations) - 1):
            origin = locations[i]
            destination = locations[i + 1]

            # ── MCP Tool Call: calculate_distance ─────────────────────────
            dist_result = await mcp_client.call_tool("calculate_distance", {
                "origin": origin,
                "destination": destination,
                "mode": mode,
            })

            transport_legs.append({
                "from": origin,
                "to": destination,
                "mode": dist_result.get("mode", mode),
                "distanceKm": dist_result.get("distance_km"),
                "durationMinutes": dist_result.get("duration_minutes"),
                "estimatedCost": dist_result.get("estimated_cost"),
            })

        # If no activities were scheduled yet, use a default leg
        if not transport_legs:
            dist_result = await mcp_client.call_tool("calculate_distance", {
                "origin": "Paharganj",
                "destination": "Connaught Place",
                "mode": mode,
            })
            transport_legs.append({
                "from": "Hotel Area",
                "to": trip.destination + " City Centre",
                "mode": dist_result.get("mode", mode),
                "distanceKm": dist_result.get("distance_km"),
                "durationMinutes": dist_result.get("duration_minutes"),
                "estimatedCost": dist_result.get("estimated_cost"),
            })

        total_cost = sum(leg.get("estimatedCost", 0) for leg in transport_legs)
        total_minutes = sum(leg.get("durationMinutes", 0) for leg in transport_legs)

        reasoning = (
            f"Computed {len(transport_legs)} transport leg(s) via MCP calculate_distance "
            f"using mode='{mode}'. Total transit: {total_minutes} min, ₹{total_cost}."
        )

        details = {
            "transport": {
                "mode": mode,
                "legs": transport_legs,
                "totalEstimatedCost": total_cost,
                "totalDurationMinutes": total_minutes,
            }
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "RouteTransport",
            "reasoning": reasoning,
            "details": details,
        })

        return "RouteTransport", reasoning, details
