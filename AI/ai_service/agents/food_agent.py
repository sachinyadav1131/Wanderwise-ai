"""
FoodAgent — refactored for Phase 7.
Queries the MCP server's `find_places` tool with category="cafe"
filtered by the trip's foodPreference instead of returning hardcoded data.
Also calls `store_agent_log` to record its recommendation rationale.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client

# Map foodPreference values to interest tags that find_places understands
_PREFERENCE_TAG_MAP: dict[str, list[str]] = {
    "vegetarian": ["vegetarian", "Indian fusion", "breakfast"],
    "vegan":       ["vegan", "healthy"],
    "non-veg":     ["kebabs", "Mughlai", "rolls", "street food"],
    "mughlai":     ["Mughlai", "kebabs"],
    "street food": ["street food", "parathas", "heritage", "budget"],
    "fine dining": ["fine dining", "upscale", "modern Indian"],
    "any":         [],
}


class FoodAgent(BaseAgent):
    def __init__(self):
        super().__init__("FoodAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "RecommendFood"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails
        food_pref = (trip.foodPreference or "Any").lower()
        interest_tags = _PREFERENCE_TAG_MAP.get(food_pref, [])

        # ── MCP Tool Call: find_places (cafes) ───────────────────────────
        places_result = await mcp_client.call_tool("find_places", {
            "destination": trip.destination,
            "category": "cafe",
            "interests": interest_tags,
        })

        cafes = places_result.get("places", [])

        meal_types = ["Breakfast", "Lunch", "Dinner"]
        suggestions = []
        for i, cafe in enumerate(cafes[:3]):
            suggestions.append({
                "mealType": meal_types[i % len(meal_types)],
                "restaurantName": cafe["name"],
                "cuisineType": ", ".join(cafe.get("tags", ["Local"])[:2]),
                "averagePrice": int(cafe.get("entry_fee", 0)) + 250,  # entry_fee=0 → estimate
                "location": cafe["location"],
                "isIndoor": cafe.get("is_indoor", True),
            })

        reasoning = (
            f"Queried MCP find_places (category=cafe) for '{trip.destination}' "
            f"with food preference '{trip.foodPreference}'. "
            f"Found {len(cafes)} options; surfacing top {len(suggestions)}."
        )

        details = {"foodSuggestions": suggestions}

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "RecommendFood",
            "reasoning": reasoning,
            "details": details,
        })

        return "RecommendFood", reasoning, details
