"""
MCP Tool: find_hotels
Simulates a dynamic external hotel-lookup service.

Design goals (replacing the static catalogue):
  - Generates hotel options algorithmically so results are always fresh,
    contextually relevant, and never limited to a hard-coded city list.
  - Respects budget tiers and stay-preference filters strictly.
  - Applies fuzzy area / location matching against incoming text criteria.
  - Outputs strictly valid HotelResult / HotelOption Pydantic objects.

Why a smart generator instead of a live API?
  Premium hotel APIs (Amadeus, SerpApi, Booking Affiliate) require paid
  commercial keys and complex OAuth flows that are out of scope for this
  deployment.  This generator produces deterministic-but-varied results
  seeded by the destination string, making it integration-test friendly
  while realistic enough for end-to-end agent demos.
"""

import hashlib
import logging
import math
import random
from typing import Iterator

from ai_service.schemas.domain import HotelResult, HotelOption

logger = logging.getLogger("mcp.hotel_tool")

# ---------------------------------------------------------------------------
# Budget tier definitions
# Prices are in INR per night.
# ---------------------------------------------------------------------------
_BUDGET_TIERS = {
    "hostel":    {"min": 400,   "max": 1_200,  "types": ["Hostel"]},
    "budget":    {"min": 800,   "max": 2_500,  "types": ["Hostel", "Budget Hotel"]},
    "mid-range": {"min": 2_000, "max": 6_500,  "types": ["Budget Hotel", "Boutique Hotel", "3-Star Hotel"]},
    "luxury":    {"min": 6_000, "max": 22_000, "types": ["4-Star Hotel", "5-Star Hotel", "Resort"]},
    "any":       {"min": 400,   "max": 50_000, "types": []},  # no type filter
}

# Amenity pools by hotel type
_AMENITY_POOLS: dict[str, list[str]] = {
    "Hostel":         ["WiFi", "Locker", "Common Room", "Rooftop Lounge", "Common Kitchen",
                       "Laundry", "Tours Desk", "Events Night"],
    "Budget Hotel":   ["WiFi", "AC", "Breakfast", "24h Front Desk", "Hot Water", "TV"],
    "Boutique Hotel": ["WiFi", "AC", "Bar", "Room Service", "Courtyard", "Artisan Décor"],
    "3-Star Hotel":   ["WiFi", "Pool", "Gym", "Restaurant", "AC", "Parking", "Concierge"],
    "4-Star Hotel":   ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", "AC",
                       "Valet Parking", "Business Centre"],
    "5-Star Hotel":   ["WiFi", "Infinity Pool", "Full Spa", "Fine Dining", "Rooftop Bar",
                       "Butler Service", "Private Gym", "Limousine Transfer"],
    "Resort":         ["WiFi", "Pool", "Spa", "Beachfront", "Water Sports", "Yoga Deck",
                       "All-Inclusive Option", "Kids Club"],
}

# Contextual area templates — filled with the destination name
_AREA_TEMPLATES = [
    "Old {city}",
    "New {city}",
    "{city} Central",
    "{city} Aerocity",
    "{city} Cantt",
    "{city} Civil Lines",
    "{city} Sector 18",
    "Downtown {city}",
    "{city} Heritage Quarter",
    "{city} Lakefront",
]

# Hotel name component pools (combined to build plausible names)
_NAME_PREFIXES = [
    "The", "Hotel", "Zostel", "Bloom", "Lemon Tree", "OYO Rooms",
    "Treebo", "Fabhotel", "Royal", "Imperial", "Grand", "Comfort",
    "Mango", "Ibis", "Radisson", "Marriott", "Taj", "ITC",
]
_NAME_SUFFIXES = [
    "Inn", "Palace", "Suites", "Residency", "Casa", "Retreat",
    "Heights", "Manor", "Lodge", "Boutique", "Premier", "Towers",
]


# ---------------------------------------------------------------------------
# Deterministic random helper
# ---------------------------------------------------------------------------

def _seeded_rng(seed_str: str) -> random.Random:
    """Return a Random instance seeded from the SHA-256 of *seed_str*."""
    digest = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
    return random.Random(digest % (2**32))


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

def _generate_hotels(
    destination: str,
    tier: dict,
    n: int,
    rng: random.Random,
) -> Iterator[HotelOption]:
    """
    Yield *n* HotelOption objects whose attributes are derived from the
    *destination* seed and the budget *tier* constraints.
    """
    city = destination.strip().title()
    allowed_types: list[str] = tier["types"] if tier["types"] else list(_AMENITY_POOLS.keys())

    areas = [tmpl.format(city=city) for tmpl in _AREA_TEMPLATES]

    for i in range(n):
        hotel_type = rng.choice(allowed_types)
        amenity_pool = _AMENITY_POOLS.get(hotel_type, ["WiFi", "AC"])
        amenity_count = rng.randint(2, min(6, len(amenity_pool)))
        amenities = rng.sample(amenity_pool, amenity_count)

        # Price: uniformly distributed within tier bounds, rounded to ₹50
        raw_price = rng.uniform(tier["min"], tier["max"])
        price = round(raw_price / 50) * 50

        # Rating: Gaussian centred on tier expectations
        tier_rating_centre = {
            "Hostel": 4.0,
            "Budget Hotel": 3.8,
            "Boutique Hotel": 4.3,
            "3-Star Hotel": 4.2,
            "4-Star Hotel": 4.5,
            "5-Star Hotel": 4.7,
            "Resort": 4.6,
        }.get(hotel_type, 4.0)
        rating = round(min(5.0, max(2.5, rng.gauss(tier_rating_centre, 0.25))), 1)

        # Distance from city centre: cheaper → further away
        price_ratio = (price - tier["min"]) / max(1, tier["max"] - tier["min"])
        max_dist = {"Hostel": 5.0, "Budget Hotel": 8.0, "Boutique Hotel": 4.0,
                    "3-Star Hotel": 12.0, "4-Star Hotel": 6.0,
                    "5-Star Hotel": 3.0, "Resort": 20.0}.get(hotel_type, 10.0)
        distance_km = round(max_dist * (1.0 - price_ratio * 0.6) + rng.uniform(0, 1.5), 1)

        # Name: prefix + city + suffix, seeded per index
        prefix = rng.choice(_NAME_PREFIXES)
        suffix = rng.choice(_NAME_SUFFIXES)
        name = f"{prefix} {city} {suffix}"

        area = rng.choice(areas)

        yield HotelOption(
            name=name,
            type=hotel_type,
            area=area,
            price_per_night=float(price),
            rating=rating,
            amenities=amenities,
            distance_from_center_km=distance_km,
        )


# ---------------------------------------------------------------------------
# Public MCP tool handler
# ---------------------------------------------------------------------------

async def find_hotels(
    destination: str,
    area: str = "",
    budget_per_night: float = 5_000.0,
    stay_preference: str = "Any",
) -> HotelResult:
    """
    MCP Tool Handler — find_hotels

    Generates a realistic, dynamically filtered list of hotel options for
    *destination*, respecting *budget_per_night* and *stay_preference*.

    Args:
        destination:      City / destination name (e.g. "Goa", "Jaipur").
        area:             Preferred area within the city (optional filter).
                          Partial, case-insensitive match applied.
        budget_per_night: Maximum acceptable price per night in INR.
        stay_preference:  Preference tier — Hostel / Budget / Mid-Range /
                          Luxury / Any (case-insensitive).

    Returns:
        HotelResult with a filtered, sorted list of HotelOption items.
    """
    logger.info(
        f"[find_hotels] destination='{destination}' area='{area}' "
        f"budget={budget_per_night} preference='{stay_preference}'"
    )

    # Resolve budget tier
    pref_key = stay_preference.strip().lower()
    tier = _BUDGET_TIERS.get(pref_key, _BUDGET_TIERS["any"])

    # Clamp effective max price to the caller-supplied budget
    effective_tier = {
        "min": tier["min"],
        "max": min(tier["max"], budget_per_night),
        "types": tier["types"],
    }

    # Guard: if the budget is below the tier minimum, widen the tier floor
    if effective_tier["max"] < effective_tier["min"]:
        effective_tier["min"] = max(400.0, budget_per_night * 0.5)

    # Generate a pool of candidates (seed = destination + preference so results
    # are stable across repeated identical calls, but vary per destination)
    seed = f"{destination.lower().strip()}::{pref_key}"
    rng = _seeded_rng(seed)
    pool_size = 16  # generate more than needed, then filter & trim
    candidates = list(_generate_hotels(destination, effective_tier, pool_size, rng))

    # Filter by budget (hard ceiling)
    candidates = [h for h in candidates if h.price_per_night <= budget_per_night]

    # Filter by area (fuzzy partial match, case-insensitive)
    if area.strip():
        area_lower = area.strip().lower()
        area_filtered = [h for h in candidates if area_lower in h.area.lower()]
        if area_filtered:
            candidates = area_filtered
            logger.debug(
                f"[find_hotels] Area filter '{area}' narrowed results to "
                f"{len(candidates)} options."
            )
        else:
            logger.debug(
                f"[find_hotels] Area filter '{area}' had no matches — "
                f"returning all budget-filtered results."
            )

    # Sort: primary → rating DESC, secondary → price ASC
    candidates.sort(key=lambda h: (-h.rating, h.price_per_night))

    # Return top-8 to keep the agent context lean
    options = candidates[:8]

    logger.info(
        f"[find_hotels] Returning {len(options)} hotel options for "
        f"'{destination}' (budget ≤ ₹{budget_per_night:.0f}/night, "
        f"preference='{stay_preference}')."
    )
    return HotelResult(
        destination=destination,
        area=area or "Any",
        options=options,
    )
