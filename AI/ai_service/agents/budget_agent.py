"""
BudgetAgent — refactored for Phase 7.
Compiles an itemized budget from context results produced by earlier agents,
then calls `save_itinerary` (with budget metadata) and `store_agent_log` via MCP.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class BudgetAgent(BaseAgent):
    def __init__(self):
        super().__init__("BudgetAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "CalculateBudget"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        # Extract stay cost from StayAgent output (if available in context)
        stay_result = state.context.get("stay_result") or {}
        stay_suggestion = stay_result.get("staySuggestion", {})
        stay_options = stay_suggestion.get("options", [])
        nights = stay_suggestion.get("nights", 1)
        stay_cost = (stay_options[0]["pricePerNight"] if stay_options else 950.0) * nights

        # Extract activity costs from RouteAgent output
        route_result = state.context.get("route_result") or {}
        activities = route_result.get("activities", [])
        activities_cost = sum(act.get("cost", 0) for act in activities)

        # Extract transport cost from route summary
        route_summary = route_result.get("routeSummary", {})
        transport_cost = route_summary.get("firstLegCost", 50.0)

        # Extract food cost estimate from FoodAgent output
        food_result = state.context.get("food_result") or {}
        food_suggestions = food_result.get("foodSuggestions", [])
        food_cost = sum(f.get("averagePrice", 300) for f in food_suggestions) * trip.travelers

        total = round(stay_cost + activities_cost + transport_cost + food_cost, 2)
        remaining = round(trip.totalBudget - total, 2)

        budget_breakdown = {
            "stay": stay_cost,
            "food": food_cost,
            "transport": transport_cost,
            "activities": activities_cost,
            "total": total,
            "tripBudget": trip.totalBudget,
            "remaining": remaining,
            "withinBudget": remaining >= 0,
        }

        # ── MCP Tool Call: update_itinerary with budget metadata ──────────
        await mcp_client.call_tool("update_itinerary", {
            "trip_id": state.tripId,
            "day_number": 1,
            "updated_day": {"budgetBreakdown": budget_breakdown},
        })

        reasoning = (
            f"Compiled itemized budget for '{trip.destination}': "
            f"Stay ₹{stay_cost}, Food ₹{food_cost}, Transport ₹{transport_cost}, "
            f"Activities ₹{activities_cost}. Total ₹{total} vs budget ₹{trip.totalBudget}. "
            f"{'Within budget.' if remaining >= 0 else 'Exceeds budget — review needed.'}"
        )

        details = {"budgetBreakdown": budget_breakdown}

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "CalculateBudget",
            "reasoning": reasoning,
            "details": details,
        })

        return "CalculateBudget", reasoning, details
