"""
WriterAgent — refactored for Phase 7.
Assembles the final structured itinerary payload from upstream agent results,
calls `update_itinerary` to persist the finalized output via MCP,
and calls `store_agent_log` to record the completion.
"""
from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


class WriterAgent(BaseAgent):
    def __init__(self):
        super().__init__("WriterAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return True

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "FormatPayload"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        # Collect upstream agent results from blackboard context
        route_details  = state.context.get("route_result")  or {}
        stay_details   = state.context.get("stay_result")   or {}
        food_details   = state.context.get("food_result")   or {}
        budget_details = state.context.get("budget_result") or {}

        activities = route_details.get("activities", [{
            "title": f"Explore {trip.destination}",
            "timeSlot": "Morning",
            "time": "09:00 AM",
            "location": trip.destination,
            "cost": 0,
            "estimatedDuration": 60,
        }])

        food_suggestions = food_details.get("foodSuggestions", [{
            "mealType": "Lunch",
            "restaurantName": "Local Eatery",
            "cuisineType": "Local",
            "averagePrice": 250,
        }])

        stay_suggestion = stay_details.get("staySuggestion", {
            "locationArea": trip.destination,
            "options": [{"name": "Local Hotel", "pricePerNight": 1000, "type": "Budget Hotel"}],
        })

        budget_breakdown = budget_details.get("budgetBreakdown", {
            "stay": 0, "food": 0, "transport": 0, "activities": 0, "total": 0,
        })

        finalized_day = {
            "dayNumber": 1,
            "date": trip.startDate,
            "summary": f"Day 1: Highlights of {trip.destination}",
            "staySuggestion": stay_suggestion,
            "foodSuggestions": food_suggestions,
            "activities": activities,
            "budgetBreakdown": budget_breakdown,
        }

        # ── MCP Tool Call: update_itinerary (finalize day 1) ─────────────
        await mcp_client.call_tool("update_itinerary", {
            "trip_id": state.tripId,
            "day_number": 1,
            "updated_day": finalized_day,
        })

        reasoning = (
            f"Assembled and formatted final itinerary payload for '{trip.destination}'. "
            f"Persisted finalized Day 1 via MCP update_itinerary."
        )

        details = {"formatted": True}

        # ── MCP Tool Call: store_agent_log ───────────────────────────────
        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "FormatPayload",
            "reasoning": reasoning,
            "details": details,
        })

        return "FormatPayload", reasoning, details
