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

        # Compute total days
        from datetime import datetime
        try:
            start_dt = datetime.strptime(trip.startDate.split("T")[0], "%Y-%m-%d")
            end_dt = datetime.strptime(trip.endDate.split("T")[0], "%Y-%m-%d")
            total_days = max((end_dt - start_dt).days + 1, 1)
        except Exception:
            total_days = 1

        # ── MCP Tool Call: find_places (attractions) ─────────────────────
        places_result = await mcp_client.call_tool("find_places", {
            "destination": trip.destination,
            "category": "attraction",
            "interests": trip.interests,
            "count": max(6, total_days * 3),
        })

        places = places_result.get("places", [])

        activities_by_day = {}
        time_slots = ["Morning", "Afternoon", "Evening"]
        start_times = ["09:00 AM", "01:00 PM", "05:00 PM"]

        # Pool of diverse daily fallbacks so subsequent days do not look duplicate
        fallback_pools = [
            [
                ("Morning", "09:30 AM", "Explore local scenic nature trails", 120),
                ("Afternoon", "02:00 PM", "Discover hidden scenic viewpoints and valleys", 90),
                ("Evening", "06:00 PM", "Leisure stroll around the cultural market street", 90)
            ],
            [
                ("Morning", "09:30 AM", "Guided historical and heritage walking tour", 150),
                ("Afternoon", "02:00 PM", "Visit notable museums and art galleries", 120),
                ("Evening", "06:30 PM", "Relaxing sunset viewpoint and valley views", 60)
            ],
            [
                ("Morning", "10:00 AM", "Adventure sports and outdoor recreation park", 180),
                ("Afternoon", "03:00 PM", "Leisure boat ride or lakeside walk", 90),
                ("Evening", "07:00 PM", "Traditional food sampling and central square walk", 120)
            ]
        ]

        for day_idx in range(total_days):
            day_num = day_idx + 1
            day_activities = []
            
            # Distribute attractions: Day 1 gets 0-2, Day 2 gets 3-5, etc.
            day_offset = day_idx * 3
            day_places = places[day_offset : day_offset + 3]
            
            if day_places:
                for i, place in enumerate(day_places):
                    day_activities.append({
                        "title": f"Visit {place['name']}",
                        "timeSlot": time_slots[i % len(time_slots)],
                        "time": start_times[i % len(start_times)],
                        "location": place["location"],
                        "cost": place.get("entry_fee", 0),
                        "estimatedDuration": place.get("avg_duration_minutes", 60),
                        "tags": place.get("tags", []),
                        "isIndoor": place.get("is_indoor", False),
                    })
            else:
                # Select a diverse fallback set by day index
                fallbacks = fallback_pools[day_idx % len(fallback_pools)]
                for i, (slot, time_str, title_template, duration) in enumerate(fallbacks):
                    day_activities.append({
                        "title": f"{title_template} in {trip.destination}",
                        "timeSlot": slot,
                        "time": time_str,
                        "location": trip.destination,
                        "cost": 0,
                        "estimatedDuration": duration,
                        "tags": ["exploration", "scenic"],
                        "isIndoor": False
                    })
            activities_by_day[str(day_num)] = day_activities

        # ── MCP Tool Call: calculate_distance between first two stops on day 1 ─────
        distance_info = {}
        top_places = places[:2]
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
            f"Queried MCP find_places for '{trip.destination}' attractions. "
            f"Distributed {len(places)} locations and custom scenic trails across {total_days} day(s)."
        )

        details = {
            "activitiesByDay": activities_by_day,
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
