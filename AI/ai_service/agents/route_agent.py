"""
RouteAgent — refactored for Phase 7 + Phase 8 (dynamic full-day curation).
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
from ai_service.services.distance_service import distance_service


def _parse_time(value: str) -> datetime:
    if not value:
        return datetime.strptime("08:00 AM", "%I:%M %p")
    for fmt in ("%I:%M %p", "%H:%M"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            continue
    return datetime.strptime("08:00 AM", "%I:%M %p")


def _format_time(value: datetime) -> str:
    return value.strftime("%I:%M %p").lstrip("0")


def _haversine_distance(origin: dict[str, Any], destination: dict[str, Any]) -> float:
    """
    Haversine distance in km between two points.
    Accepts both 'lat'/'lng' and 'latitude'/'longitude' key conventions
    since the MCP PlaceItem model serialises to latitude/longitude.
    """
    lat1 = origin.get("lat") or origin.get("latitude") or 0.0
    lng1 = origin.get("lng") or origin.get("longitude") or 0.0
    lat2 = destination.get("lat") or destination.get("latitude") or 0.0
    lng2 = destination.get("lng") or destination.get("longitude") or 0.0
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


def _slot_for_time(dt: datetime) -> str:
    """Map a datetime to a named time slot."""
    hour = dt.hour
    if hour < 12:
        return "Morning"
    elif hour < 17:
        return "Afternoon"
    else:
        return "Evening"


def _build_day_activities_dynamic(
    day_places: list[dict[str, Any]],
    destination: str,
    travel_style: str = "Moderate",
    end_time_str: str = "08:00 PM",
) -> list[dict[str, Any]]:
    """
    Dynamically fill a day from 09:00 AM to end_time_str by packing as many
    places as comfortably fit, inserting a 45-min lunch break, and labelling
    each transit leg with distance + duration.
    """
    day_start = _parse_time("09:00 AM")
    day_end = _parse_time(end_time_str)
    lunch_start_window = _parse_time("12:00 PM")
    lunch_end_window = _parse_time("01:30 PM")

    current_time = day_start
    current_coords: dict[str, float] = {"lat": 28.6139, "lng": 77.2090}  # hotel fallback
    activities: list[dict[str, Any]] = []
    lunch_inserted = False

    for idx, place in enumerate(day_places):
        duration_min = int(place.get("avg_duration_minutes") or place.get("estimatedDuration") or 90)
        duration_min = max(duration_min, 45)

        # Insert lunch if we are in the lunch window and haven't yet
        if not lunch_inserted and current_time >= lunch_start_window and current_time < lunch_end_window:
            lunch_end = min(current_time + timedelta(minutes=45), lunch_end_window)
            activities.append({
                "title": "Lunch Break",
                "timeSlot": "Afternoon",
                "time": _format_time(current_time),
                "location": destination,
                "cost": 0,
                "estimatedDuration": 45,
                "description": "Midday break & local dining",
                "rationale": "Scheduled midday break to recharge before the afternoon.",
                "tags": ["food", "break"],
                "isIndoor": True,
                "_isLunch": True,
            })
            current_time = lunch_end
            lunch_inserted = True

        # Compute transit from previous stop via Google Distance Matrix API (with Haversine fallback)
        place_lat = place.get("lat") or place.get("latitude")
        place_lng = place.get("lng") or place.get("longitude")
        place_coords = {
            "lat": float(place_lat) if place_lat is not None else current_coords["lat"],
            "lng": float(place_lng) if place_lng is not None else current_coords["lng"],
        }
        if idx > 0:
            dist_res = distance_service.get_distance_and_duration_sync(current_coords, place_coords, mode="driving")
            transit_distance_km = dist_res["distance_km"]
            transit_minutes = dist_res["duration_minutes"]
        else:
            transit_distance_km = 0.0
            transit_minutes = 0

        activity_start = current_time + timedelta(minutes=transit_minutes) if transit_minutes > 0 else current_time
        activity_end = activity_start + timedelta(minutes=duration_min)

        # Stop packing if activity would overflow the day
        if activity_end > day_end:
            break

        tags_str = ", ".join(place.get("tags", ["scenic", "culture"])[:2])
        transit_label = (
            f"Travel: {transit_minutes} min · {round(transit_distance_km, 1)} km · Cab → "
            if transit_distance_km > 0
            else ""
        )

        activities.append({
            "title": f"Visit {place['name']}",
            "timeSlot": _slot_for_time(activity_start),
            "time": _format_time(activity_start),
            "location": place.get("location", place["name"]),
            "cost": place.get("entry_fee", 0),
            "estimatedDuration": duration_min,
            "description": place.get("description") or f"Top-rated spot in {place.get('location', destination)} showcasing {tags_str}.",
            "rationale": f"{transit_label}Curated for your interest in {tags_str} · {travel_style} pace.",
            "tags": place.get("tags", []),
            "isIndoor": place.get("is_indoor", False),
            "_transitDistanceKm": round(transit_distance_km, 1),
            "_transitMinutes": transit_minutes,
        })

        current_time = activity_end
        current_coords = place_coords

    return activities


def _build_fallback_day_activities(
    day_num: int,
    destination: str,
    travel_style: str = "Moderate",
    end_time_str: str = "08:00 PM",
) -> list[dict[str, Any]]:
    """Generate generic fallback activities when MCP returns no places."""
    day_end = _parse_time(end_time_str)
    total_minutes = int((day_end - _parse_time("09:00 AM")).total_seconds() / 60)
    num_slots = max(3, total_minutes // 120)  # ~1 activity per 2 hours

    pools = [
        [
            ("09:30 AM", "Explore local scenic nature trails", 120, "Morning"),
            ("12:30 PM", "Lunch at a local favourite", 45, "Afternoon"),
            ("02:00 PM", "Discover hidden scenic viewpoints", 90, "Afternoon"),
            ("05:00 PM", "Leisure stroll around the cultural market street", 90, "Evening"),
        ],
        [
            ("09:30 AM", "Guided historical and heritage walking tour", 150, "Morning"),
            ("12:30 PM", "Lunch at a local favourite", 45, "Afternoon"),
            ("02:30 PM", "Visit notable museums and art galleries", 120, "Afternoon"),
            ("06:00 PM", "Relaxing sunset viewpoint and valley views", 60, "Evening"),
        ],
        [
            ("10:00 AM", "Adventure sports and outdoor recreation park", 180, "Morning"),
            ("12:30 PM", "Lunch at a local favourite", 45, "Afternoon"),
            ("03:00 PM", "Leisure boat ride or lakeside walk", 90, "Afternoon"),
            ("06:30 PM", "Traditional food sampling and central square walk", 90, "Evening"),
        ],
    ]

    pool = pools[(day_num - 1) % len(pools)]
    result = []
    for time_str, desc, dur, slot in pool[:num_slots]:
        result.append({
            "title": f"{desc} in {destination}",
            "timeSlot": slot,
            "time": time_str,
            "location": destination,
            "cost": 0,
            "estimatedDuration": dur,
            "description": f"Immersive experience in {destination} tailored for your trip preferences.",
            "rationale": f"Selected to provide a balanced {travel_style} pace on Day {day_num}.",
            "tags": ["exploration", "scenic"],
            "isIndoor": False,
        })
    return result


def solve_itinerary_timeline(places, hotel_location, start_time="08:00 AM", end_time="08:00 PM"):
    """
    Greedily sequence activities by proximity and build a realistic day timeline.

    Scheduling rule (strict):
        current_time
          → [activity visits for 'duration' min]
          → current_time = activity_end
          → [transit leg: transit_minutes + 10-min buffer]
          → current_time = transit_end
          → next activity starts at current_time

    Coordinates: if all incoming places share the same default lat/lng
    (because Activity.location is stored as a string, not coordinates),
    we assign stable pseudo-coordinates per place name via _estimated_coordinates
    so Haversine distances are realistic rather than always 0 → always 10 min.
    """
    if not places:
        return {"days": []}

    BUFFER_MIN = 10  # gap between transit arrival and activity entry

    grouped_by_day: dict[int, list[dict[str, Any]]] = {}
    for place in places:
        day_num = int(place.get("dayNumber") or 1)
        grouped_by_day.setdefault(day_num, []).append(place)

    start_dt = _parse_time(start_time)
    end_dt = _parse_time(end_time)
    days_output = []

    for day_num in sorted(grouped_by_day.keys()):
        day_places = grouped_by_day[day_num]

        # ── Coordinate sanity check ──────────────────────────────────────────
        # If every place has the same coordinates (fallback from tripController),
        # assign stable pseudo-coordinates so distances aren't all zero.
        DEFAULT_LAT, DEFAULT_LNG = 28.6129, 77.2295
        EPSILON = 0.001
        all_same_coords = all(
            abs(float(p.get("lat") or DEFAULT_LAT) - DEFAULT_LAT) < EPSILON
            and abs(float(p.get("lng") or DEFAULT_LNG) - DEFAULT_LNG) < EPSILON
            for p in day_places
        )
        if all_same_coords:
            for p in day_places:
                coords = _estimated_coordinates(
                    f"{p.get('location', '')}:{p.get('name', '')}"
                )
                p["lat"] = coords["lat"]
                p["lng"] = coords["lng"]

        # ── Nearest-neighbour ordering ───────────────────────────────────────
        hotel_coords = hotel_location or {"lat": DEFAULT_LAT, "lng": DEFAULT_LNG}
        current_loc = dict(hotel_coords)
        remaining = list(day_places)
        ordered_places: list[dict[str, Any]] = []
        while remaining:
            nxt = min(remaining, key=lambda p: _haversine_distance(current_loc, p))
            remaining.remove(nxt)
            ordered_places.append(nxt)
            current_loc = nxt

        day_items: list[dict[str, Any]] = []

        # ── Hotel departure ──────────────────────────────────────────────────
        dep_end = start_dt + timedelta(minutes=15)
        day_items.append({
            "type": "transit",
            "name": f"Hotel departure (Day {day_num})",
            "mode": "Cab",
            "startTime": _format_time(start_dt),
            "endTime": _format_time(dep_end),
            "durationMinutes": 15,
            "distanceKm": 0.0,
            "note": "Depart from hotel",
        })
        current_time = dep_end

        lunch_window_start = _parse_time("12:00 PM")
        lunch_window_end = _parse_time("01:30 PM")
        lunch_inserted = False
        prev_place: dict | None = None

        for place in ordered_places:
            # Duration of visit (at least 45 min)
            duration = int(place.get("maxDuration") or place.get("minDuration") or 90)
            duration = max(duration, 45)

            # ── Lunch window ─────────────────────────────────────────────────
            if not lunch_inserted and current_time >= lunch_window_start and current_time < lunch_window_end:
                lunch_end = min(current_time + timedelta(minutes=45), lunch_window_end)
                day_items.append({
                    "type": "lunch",
                    "name": "Lunch Break",
                    "startTime": _format_time(current_time),
                    "endTime": _format_time(lunch_end),
                    "durationMinutes": 45,
                    "note": "Midday break & local dining",
                })
                current_time = lunch_end
                lunch_inserted = True

            # ── Transit from previous stop → this place ──────────────────────
            if prev_place is not None:
                dist_res = distance_service.get_distance_and_duration_sync(prev_place, place, mode="driving")
                transit_distance = dist_res["distance_km"]
                transit_minutes = dist_res["duration_minutes"]

                transit_start = current_time
                transit_end = transit_start + timedelta(minutes=transit_minutes)
                # Add 10-min buffer after cab arrives before activity begins
                activity_start = transit_end + timedelta(minutes=BUFFER_MIN)

                day_items.append({
                    "type": "transit",
                    "name": f"Travel to {place.get('name')}",
                    "mode": "Cab",
                    "startTime": _format_time(transit_start),
                    "endTime": _format_time(transit_end),
                    "durationMinutes": transit_minutes,
                    "distanceKm": round(transit_distance, 1),
                    "note": f"{transit_minutes} min · {round(transit_distance, 1)} km · Cab",
                })
                current_time = activity_start
            else:
                activity_start = current_time

            activity_end = activity_start + timedelta(minutes=duration)

            # Stop packing if activity would overflow the day
            if activity_end > end_dt:
                break

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
            prev_place = place

        # ── Return to hotel ──────────────────────────────────────────────────
        ret_end = min(current_time + timedelta(minutes=20), end_dt)
        day_items.append({
            "type": "transit",
            "name": "Return to hotel",
            "mode": "Cab",
            "startTime": _format_time(current_time),
            "endTime": _format_time(ret_end),
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

        # Read tripEndTime from trip details (default "08:00 PM")
        trip_end_time = getattr(trip, "tripEndTime", None) or "08:00 PM"

        # Fetch enough places to fill full days: 6 stops per day minimum
        fetch_count = max(8, total_days * 6)
        places_result = await mcp_client.call_tool("find_places", {
            "destination": trip.destination,
            "category": "attraction",
            "interests": trip.interests,
            "count": fetch_count,
        })

        places = places_result.get("places", [])

        # Distribute places across days evenly
        places_per_day = max(1, len(places) // total_days) if places else 0
        activities_by_day: dict[str, list[dict[str, Any]]] = {}

        for day_idx in range(total_days):
            day_num = day_idx + 1
            day_start = day_idx * places_per_day
            day_end_idx = day_start + places_per_day if day_idx < total_days - 1 else len(places)
            day_places = places[day_start:day_end_idx]

            if day_places:
                day_activities = _build_day_activities_dynamic(
                    day_places,
                    destination=trip.destination,
                    travel_style=trip.travelStyle or "Moderate",
                    end_time_str=trip_end_time,
                )
            else:
                day_activities = _build_fallback_day_activities(
                    day_num,
                    destination=trip.destination,
                    travel_style=trip.travelStyle or "Moderate",
                    end_time_str=trip_end_time,
                )

            activities_by_day[str(day_num)] = day_activities

        # Compute first-leg distance info via MCP
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

        # Prepare places with coordinates for route optimisation
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

            # Build per-day activity lists using the optimised ordering
            optimised_by_day: dict[str, list[dict[str, Any]]] = {}
            per_day_count = max(1, len(ordered_places) // total_days)
            for d_idx in range(total_days):
                d_num = d_idx + 1
                d_start = d_idx * per_day_count
                d_end = d_start + per_day_count if d_idx < total_days - 1 else len(ordered_places)
                d_places = ordered_places[d_start:d_end]
                if d_places:
                    optimised_by_day[str(d_num)] = _build_day_activities_dynamic(
                        d_places,
                        destination=trip.destination,
                        travel_style=trip.travelStyle or "Moderate",
                        end_time_str=trip_end_time,
                    )
                else:
                    optimised_by_day[str(d_num)] = _build_fallback_day_activities(
                        d_num,
                        destination=trip.destination,
                        travel_style=trip.travelStyle or "Moderate",
                        end_time_str=trip_end_time,
                    )

            route_alternatives.append({
                "id": f"hotel-option-{index + 1}",
                "hotel": hotel,
                "estimatedDistanceKm": total_distance_km,
                "distanceSource": "geometric estimate",
                "activitiesByDay": optimised_by_day,
            })

        # Use first route alternative as the default
        selected = route_alternatives[0]
        activities_by_day = selected["activitiesByDay"]
        distance_info = {"totalDistanceKm": selected["estimatedDistanceKm"], "algorithm": "nearest-neighbour + 2-opt"}

        reasoning = (
            f"Queried MCP find_places for '{trip.destination}' attractions (fetched {fetch_count}, got {len(places)}). "
            f"Distributed across {total_days} day(s) dynamically up to {trip_end_time} using Haversine transit pacing."
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
