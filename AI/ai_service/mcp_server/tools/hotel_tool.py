"""
MCP Tool: find_hotels
Returns hotel suggestions filtered by destination area, budget, and stay preference.
Mock implementation — ready to swap for a live Hotels API (e.g., Booking.com, MakeMyTrip).
"""
import logging
from ai_service.schemas.domain import HotelResult, HotelOption

logger = logging.getLogger("mcp.hotel_tool")

# ---------------------------------------------------------------------------
# Curated mock hotel catalogue — indexed by destination (lowercase).
# ---------------------------------------------------------------------------
_HOTEL_CATALOGUE: dict[str, list[dict]] = {
    "delhi": [
        {
            "name": "Smyle Inn Hostel",
            "type": "Hostel",
            "area": "Paharganj",
            "price_per_night": 950.0,
            "rating": 4.1,
            "amenities": ["WiFi", "Locker", "Common Room"],
            "distance_from_center_km": 1.2,
        },
        {
            "name": "Hotel Namaskar",
            "type": "Budget Hotel",
            "area": "Karol Bagh",
            "price_per_night": 1400.0,
            "rating": 3.8,
            "amenities": ["WiFi", "AC", "Breakfast"],
            "distance_from_center_km": 3.5,
        },
        {
            "name": "The Backpacker Co.",
            "type": "Hostel",
            "area": "Connaught Place",
            "price_per_night": 700.0,
            "rating": 4.3,
            "amenities": ["WiFi", "Rooftop Lounge", "Lockers"],
            "distance_from_center_km": 0.8,
        },
        {
            "name": "Lemon Tree Premier",
            "type": "3-Star Hotel",
            "area": "Aerocity",
            "price_per_night": 3200.0,
            "rating": 4.5,
            "amenities": ["Pool", "Gym", "Restaurant", "WiFi", "AC"],
            "distance_from_center_km": 14.0,
        },
        {
            "name": "Bloom Hotel Connaught Place",
            "type": "Boutique Hotel",
            "area": "Connaught Place",
            "price_per_night": 2100.0,
            "rating": 4.4,
            "amenities": ["WiFi", "AC", "Bar"],
            "distance_from_center_km": 0.5,
        },
        {
            "name": "Zostel Delhi",
            "type": "Hostel",
            "area": "Hauz Khas",
            "price_per_night": 600.0,
            "rating": 4.2,
            "amenities": ["WiFi", "Common Kitchen", "Events"],
            "distance_from_center_km": 8.0,
        },
    ],
}

_PREFERENCE_TYPE_MAP: dict[str, list[str]] = {
    "hostel": ["Hostel"],
    "budget": ["Hostel", "Budget Hotel"],
    "mid-range": ["Budget Hotel", "Boutique Hotel"],
    "luxury": ["3-Star Hotel", "4-Star Hotel", "5-Star Hotel"],
    "any": [],  # No type filter
}


async def find_hotels(
    destination: str,
    area: str = "",
    budget_per_night: float = 5000.0,
    stay_preference: str = "Any",
) -> HotelResult:
    """
    MCP Tool Handler — find_hotels

    Args:
        destination:      City/destination name (e.g. "Delhi").
        area:             Preferred area within the city (optional filter).
        budget_per_night: Maximum acceptable price per night in INR.
        stay_preference:  Preference type — Hostel / Budget / Mid-Range / Luxury / Any.

    Returns:
        HotelResult with filtered list of HotelOption items.
    """
    logger.info(
        f"[find_hotels] destination='{destination}' area='{area}' "
        f"budget={budget_per_night} preference='{stay_preference}'"
    )

    catalogue = _HOTEL_CATALOGUE.get(destination.lower(), _HOTEL_CATALOGUE["delhi"])

    # Filter by budget
    filtered = [h for h in catalogue if h["price_per_night"] <= budget_per_night]

    # Filter by stay preference type
    pref_key = stay_preference.lower()
    allowed_types = _PREFERENCE_TYPE_MAP.get(pref_key, [])
    if allowed_types:
        filtered = [h for h in filtered if h["type"] in allowed_types]

    # Filter by area (partial match, case-insensitive)
    if area:
        area_filtered = [h for h in filtered if area.lower() in h["area"].lower()]
        if area_filtered:
            filtered = area_filtered  # Only apply if it yields results

    # Sort by rating descending
    filtered.sort(key=lambda h: h["rating"], reverse=True)

    options = [HotelOption(**h) for h in filtered]

    logger.info(f"[find_hotels] Returning {len(options)} hotel options for '{destination}'")
    return HotelResult(destination=destination, area=area or "Any", options=options)
