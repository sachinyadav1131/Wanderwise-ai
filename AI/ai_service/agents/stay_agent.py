"""
StayAgent — refactored for Phase 7.
Queries the MCP server's `find_hotels` tool instead of returning hardcoded data.
Also calls `store_agent_log` to record its recommendation rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class StayAgent(BaseAgent):
    def __init__(self):
        super().__init__("StayAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RecommendStay"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails
        # Allocate ~30% of total budget for stay across the trip duration
        import math
        from datetime import datetime
        try:
            start = datetime.fromisoformat(trip.startDate)
            end = datetime.fromisoformat(trip.endDate)
            nights = max((end - start).days, 1)
        except ValueError:
            nights = 1

        budget_per_night = math.floor((trip.totalBudget * 0.30) / nights)

        # ── MCP Tool Call: find_hotels ───────────────────────────────────
        hotel_result = await mcp_client.call_tool("find_hotels", {
            "destination": trip.destination,
            "area": "",
            "budget_per_night": float(budget_per_night),
            "stay_preference": trip.stayPreference,
            "travelers": int(trip.travelers or 1),
        })

        options = hotel_result.get("options", [])
        area = hotel_result.get("area", "Central Area")

        reasoning = (
            f"Queried MCP find_hotels for '{trip.destination}' with budget "
            f"₹{budget_per_night}/night ({trip.stayPreference} preference) for {nights} night(s). "
            f"Found {len(options)} matching options."
        )

        details = {
            "staySuggestion": {
                "locationArea": area,
                "nights": nights,
                "budgetPerNight": budget_per_night,
                "options": [
                    {
                        "name": h["name"],
                        "pricePerNight": h["price_per_night"],
                        "type": h["type"],
                        "rating": h["rating"],
                        "amenities": h.get("amenities", []),
                        "address": h.get("area") or area,
                        "distanceFromRoute": f"{h.get('distance_from_center_km', 1.0)} km from center",
                        "image": h.get("image"),
                    }
                    for h in options[:3]  # Surface top 3 options
                ],
            }
        }

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "RecommendStay",
            "reasoning": reasoning,
            "details": details,
        })

        return "RecommendStay", reasoning, details
