"""
RouteAgent — refactored for Phase 7.
Queries the MCP server's `find_places` and `calculate_distance` tools
instead of returning hardcoded activity lists.
Also calls `store_agent_log` to record its routing rationale.
"""
import math
import hashlib
from datetime import datetime, timedelta
from typing import Any

from ai_service.agents.base_agent import BaseAgent
from ai_service.schemas.domain import WorkflowState, AgentResult
from ai_service.mcp_server.client import mcp_client


def _parse_time(value: str) -> datetime:
    if not value:
        return datetime.strptime("08:00 AM", "%I:%M %p")
    return datetime.strptime(value, "%I:%M %p")


def _format_time(value: datetime) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def _haversine_distance(origin: dict[str, Any], destination: dict[str, Any]) -> float:
    lat1, lng1 = origin.get("lat", 0.0), origin.get("lng", 0.0)
    lat2, lng2 = destination.get("lat", 0.0), destination.get("lng", 0.0)
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _estimated_coordinates(seed: str, center: dict[str, float] | None = None) -> dict[str, float]:
    """Stable fallback until a Places provider supplies a venue's real coordinates."""
    digest = hashlib.sha256(seed.encode()).digest()
    base = center or {"lat": 28.6139, "lng": 77.2090}
    return {
        "lat": base["lat"] + ((digest[0] / 255) - 0.5) * 0.12,
        "lng": base["lng"] + ((digest[1] / 255) - 0.5) * 0.12,
    }


def _two_opt(route: list[dict[str, Any]], start: dict[str, float]) -> list[dict[str, Any]]:
    """Improve a nearest-neighbour route by reversing segments when it shortens the trip."""
    if len(route) < 4:
        return route
    best = route[:]
    improved = True
    while improved:
        improved = False
        for i in range(len(best) - 2):
            for j in range(i + 2, len(best)):
                previous = start if i == 0 else best[i - 1]
                following = best[j + 1] if j + 1 < len(best) else start
                before = _haversine_distance(previous, best[i]) + _haversine_distance(best[j], following)
                after = _haversine_distance(previous, best[j]) + _haversine_distance(best[i], following)
                if after + 0.01 < before:
                    best[i:j + 1] = reversed(best[i:j + 1])
                    improved = True
    return best


def optimize_route(places: list[dict[str, Any]], hotel: dict[str, Any]) -> tuple[list[dict[str, Any]], float]:
    """Nearest-neighbour construction followed by 2-opt; returns an ordered round trip."""
    start = hotel["coordinates"]
    remaining = [dict(place) for place in places]
    current = start
    ordered: list[dict[str, Any]] = []
    while remaining:
        next_place = min(remaining, key=lambda place: _haversine_distance(current, place))
        remaining.remove(next_place)
        ordered.append(next_place)
        current = next_place
    ordered = _two_opt(ordered, start)
    total = _haversine_distance(start, ordered[0]) if ordered else 0.0
    total += sum(_haversine_distance(ordered[index], ordered[index + 1]) for index in range(len(ordered) - 1))
    total += _haversine_distance(ordered[-1], start) if ordered else 0.0
    return ordered, round(total, 1)


def _activities_by_day(ordered_places: list[dict[str, Any]], total_days: int) -> dict[str, list[dict[str, Any]]]:
    slots = [("Morning", "09:00 AM"), ("Afternoon", "01:00 PM"), ("Evening", "05:00 PM")]
    result: dict[str, list[dict[str, Any]]] = {str(day): [] for day in range(1, total_days + 1)}
    for index, place in enumerate(ordered_places):
        day = min(index // 3 + 1, total_days)
        slot, time = slots[index % 3]
        tags_str = ", ".join(place.get("tags", ["scenic", "heritage"])[:2])
        result[str(day)].append({
            "title": f"Visit {place['name']}",
            "timeSlot": slot,
            "time": time,
            "location": place.get("location", place["name"]),
            "cost": place.get("entry_fee", 0),
            "estimatedDuration": place.get("avg_duration_minutes", 60),
            "description": place.get("description") or f"Popular spot in {place.get('location', 'the destination')} highlighting {tags_str}.",
            "rationale": f"Curated for your interest in {tags_str}.",
            "tags": place.get("tags", []),
            "isIndoor": place.get("is_indoor", False),
        })
    return result


def solve_itinerary_timeline(places, hotel_location, start_time="08:00 AM", end_time="08:00 PM"):
    """Greedily sequence activities by proximity and allocate a day timeline per day with lunch and transit."""
    if not places:
        return {"days": []}

    grouped_by_day: dict[int, list[dict[str, Any]]] = {}
    for place in places:
        day_num = int(place.get("dayNumber") or 1)
        grouped_by_day.setdefault(day_num, []).append(place)

    start_dt = _parse_time(start_time)
    end_dt = _parse_time(end_time)
    days_output = []

    for day_num in sorted(grouped_by_day.keys()):
        day_places = grouped_by_day[day_num]
        day_items: list[dict[str, Any]] = []
        current_location = hotel_location or {"lat": 0.0, "lng": 0.0}

        day_items.append({
            "type": "transit",
            "name": f"Hotel departure (Day {day_num})",
            "mode": "Cab",
            "startTime": _format_time(start_dt),
            "endTime": _format_time(start_dt + timedelta(minutes=15)),
            "durationMinutes": 15,
            "distanceKm": 0.0,
            "note": "Depart from hotel",
        })

        current_time = start_dt + timedelta(minutes=15)
        remaining_places = list(day_places)
        ordered_places = []

        while remaining_places:
            next_place = min(
                remaining_places,
                key=lambda place: _haversine_distance(current_location, place),
            )
            remaining_places.remove(next_place)
            ordered_places.append(next_place)
            current_location = next_place

        lunch_window_start = _parse_time("12:00 PM")
        lunch_window_end = _parse_time("01:30 PM")
        lunch_inserted = False

        for idx, place in enumerate(ordered_places):
            duration = int(place.get("maxDuration") or place.get("minDuration") or 90)
            duration = max(duration, 45)

            if not lunch_inserted and current_time < lunch_window_end:
                lunch_start = max(current_time, lunch_window_start)
                lunch_end = lunch_start + timedelta(minutes=45)
                if lunch_end <= lunch_window_end:
                    day_items.append({
                        "type": "lunch",
                        "name": "Lunch Break",
                        "startTime": _format_time(lunch_start),
                        "endTime": _format_time(lunch_end),
                        "durationMinutes": 45,
                        "note": "Midday break & local dining",
                    })
                    current_time = lunch_end
                    lunch_inserted = True

            activity_start = current_time
            activity_end = activity_start + timedelta(minutes=duration)
            if activity_end > end_dt:
                break

            if day_items and day_items[-1].get("type") != "transit":
                prev_place = ordered_places[idx - 1] if idx > 0 else None
                if prev_place is not None:
                    transit_distance = _haversine_distance(prev_place, place)
                    transit_minutes = max(10, int(transit_distance * 3))
                    if activity_start - timedelta(minutes=transit_minutes) >= start_dt:
                        day_items.append({
                            "type": "transit",
                            "name": f"Travel to {place.get('name')}",
                            "mode": "Cab",
                            "startTime": _format_time(activity_start - timedelta(minutes=transit_minutes)),
                            "endTime": _format_time(activity_start),
                            "durationMinutes": transit_minutes,
                            "distanceKm": round(transit_distance, 1),
                            "note": "Transit",
                        })

            day_items.append({
                "type": "activity",
                "name": place.get("name"),
                "startTime": _format_time(activity_start),
                "endTime": _format_time(activity_end),
                "durationMinutes": duration,
                "location": place.get("location") or place.get("name"),
                "note": place.get("description") or place.get("rationale") or "Planned activity",
            })
            current_time = activity_end

        day_items.append({
            "type": "transit",
            "name": "Return to hotel",
            "mode": "Cab",
            "startTime": _format_time(current_time),
            "endTime": _format_time(min(current_time + timedelta(minutes=20), end_dt)),
            "durationMinutes": 20,
            "distanceKm": 0.0,
            "note": "Return to hotel",
        })

        days_output.append({
            "day": day_num,
            "date": f"Day {day_num}",
            "items": day_items,
        })

    return {"days": days_output}


class RouteAgent(BaseAgent):
    def __init__(self):
        super().__init__("RouteAgent")

    def validate_input(self, state: WorkflowState) -> bool:
        return state.tripDetails is not None

    def validate_output(self, result: AgentResult) -> bool:
        return result.action == "OptimizeRoutes"

    async def _execute_logic(self, state: WorkflowState) -> tuple[str, str, dict | None]:
        trip = state.tripDetails

        from datetime import datetime
        try:
            start_dt = datetime.strptime(trip.startDate.split("T")[0], "%Y-%m-%d")
            end_dt = datetime.strptime(trip.endDate.split("T")[0], "%Y-%m-%d")
            total_days = max((end_dt - start_dt).days + 1, 1)
        except Exception:
            total_days = 1

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
            
            day_offset = day_idx * 3
            day_places = places[day_offset : day_offset + 3]
            
            if day_places:
                for i, place in enumerate(day_places):
                    tags_str = ", ".join(place.get("tags", ["scenic", "culture"])[:2])
                    day_activities.append({
                        "title": f"Visit {place['name']}",
                        "timeSlot": time_slots[i % len(time_slots)],
                        "time": start_times[i % len(start_times)],
                        "location": place["location"],
                        "cost": place.get("entry_fee", 0),
                        "estimatedDuration": place.get("avg_duration_minutes", 60),
                        "description": place.get("description") or f"Top rated spot in {place.get('location', trip.destination)} showcasing {tags_str}.",
                        "rationale": f"Curated for your interest in {tags_str} matching your {trip.travelStyle or 'Moderate'} pace.",
                        "tags": place.get("tags", []),
                        "isIndoor": place.get("is_indoor", False),
                    })
            else:
                fallbacks = fallback_pools[day_idx % len(fallback_pools)]
                for i, (slot, time_str, title_template, duration) in enumerate(fallbacks):
                    day_activities.append({
                        "title": f"{title_template} in {trip.destination}",
                        "timeSlot": slot,
                        "time": time_str,
                        "location": trip.destination,
                        "cost": 0,
                        "estimatedDuration": duration,
                        "description": f"Immersive experience in {trip.destination} tailored for your trip preferences.",
                        "rationale": f"Selected to provide a balanced {trip.travelStyle or 'Moderate'} pace experience on Day {day_num}.",
                        "tags": ["exploration", "scenic"],
                        "isIndoor": False
                    })
            activities_by_day[str(day_num)] = day_activities

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

        prepared_places = []
        for place in places:
            point = dict(place)
            if point.get("latitude") is None or point.get("longitude") is None:
                point.update(_estimated_coordinates(f"{trip.destination}:{point['name']}"))
            else:
                point.update({"lat": point["latitude"], "lng": point["longitude"]})
            prepared_places.append(point)

        hotels = (state.context.get("stay_result") or {}).get("staySuggestion", {}).get("options", [])[:3]
        if not hotels:
            hotels = [{"name": "Central stay", "address": trip.destination, "pricePerNight": 0, "rating": 0}]
        route_alternatives = []
        for index, hotel in enumerate(hotels):
            candidate = {**hotel, "coordinates": _estimated_coordinates(f"{trip.destination}:{hotel['name']}")}
            ordered_places, total_distance_km = optimize_route(prepared_places, candidate)
            route_alternatives.append({
                "id": f"hotel-option-{index + 1}", "hotel": hotel,
                "estimatedDistanceKm": total_distance_km, "distanceSource": "geometric estimate",
                "activitiesByDay": _activities_by_day(ordered_places, total_days),
            })

        selected = route_alternatives[0]
        activities_by_day = selected["activitiesByDay"]
        distance_info = {"totalDistanceKm": selected["estimatedDistanceKm"], "algorithm": "nearest-neighbour + 2-opt"}

        reasoning = (
            f"Queried MCP find_places for '{trip.destination}' attractions. "
            f"Distributed {len(places)} locations and custom scenic trails across {total_days} day(s)."
        )

        details = {
            "activitiesByDay": activities_by_day,
            "routeSummary": distance_info,
            "routeAlternatives": route_alternatives,
        }

        await mcp_client.call_tool("store_agent_log", {
            "trip_id": state.tripId,
            "agent_name": self.name,
            "action": "OptimizeRoutes",
            "reasoning": reasoning,
            "details": details,
        })

        return "OptimizeRoutes", reasoning, details
