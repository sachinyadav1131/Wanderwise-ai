import sys
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))

from ai_service.agents.route_agent import optimize_route, solve_itinerary_timeline


def _parse_time(value):
    import datetime
    return datetime.datetime.strptime(value, "%I:%M %p")


def test_solve_itinerary_timeline_sequences_by_proximity_and_inserts_lunch():
    hotel_location = {"lat": 28.6129, "lng": 77.2295}
    places = [
        {"name": "Red Fort", "lat": 28.6562, "lng": 77.2410, "minDuration": 90, "maxDuration": 120},
        {"name": "India Gate", "lat": 28.6128, "lng": 77.2295, "minDuration": 60, "maxDuration": 90},
        {"name": "Qutub Minar", "lat": 28.5244, "lng": 77.1855, "minDuration": 120, "maxDuration": 180},
    ]

    result = solve_itinerary_timeline(places, hotel_location, start_time="08:00 AM", end_time="08:00 PM")

    day_items = result["days"][0]["items"]
    activity_names = [item["name"] for item in day_items if item["type"] == "activity"]

    assert activity_names[0] == "India Gate"
    assert activity_names[1] == "Red Fort"
    assert activity_names[2] == "Qutub Minar"

    lunch_items = [item for item in day_items if item["type"] == "lunch"]
    assert len(lunch_items) == 1
    assert _parse_time(lunch_items[0]["startTime"]) >= _parse_time("12:00 PM")
    assert _parse_time(lunch_items[0]["endTime"]) <= _parse_time("01:30 PM")

    last_item = day_items[-1]
    assert _parse_time(last_item["endTime"]) <= _parse_time("08:00 PM")


def test_optimize_route_returns_a_shortened_round_trip_from_hotel():
    hotel = {"coordinates": {"lat": 0.0, "lng": 0.0}}
    places = [
        {"name": "Far", "lat": 0.0, "lng": 3.0},
        {"name": "Near", "lat": 0.0, "lng": 0.5},
        {"name": "Middle", "lat": 0.0, "lng": 1.0},
    ]

    ordered, distance_km = optimize_route(places, hotel)

    assert [place["name"] for place in ordered] == ["Near", "Middle", "Far"]
    assert distance_km > 0
