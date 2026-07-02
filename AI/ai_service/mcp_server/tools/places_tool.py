"""
MCP Tool: find_places
Returns attractions, indoor backups, markets, and cafes for a destination.
Mock implementation — ready to swap for a live Places API (e.g., Google Places, Foursquare).
"""
import logging
from ai_service.schemas.domain import PlacesResult, PlaceItem

logger = logging.getLogger("mcp.places_tool")

# ---------------------------------------------------------------------------
# Curated mock places catalogue — indexed by destination + category.
# ---------------------------------------------------------------------------
_PLACES_CATALOGUE: dict[str, list[dict]] = {
    # ── Outdoor Attractions ──────────────────────────────────────────────
    "delhi:attraction": [
        {"name": "India Gate", "category": "attraction", "location": "Kartavya Path, New Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["iconic", "monument", "park"], "is_indoor": False},
        {"name": "Qutub Minar", "category": "attraction", "location": "Mehrauli, Delhi",
         "entry_fee": 40.0, "avg_duration_minutes": 90, "tags": ["UNESCO", "heritage", "history"], "is_indoor": False},
        {"name": "Humayun's Tomb", "category": "attraction", "location": "Nizamuddin East, Delhi",
         "entry_fee": 40.0, "avg_duration_minutes": 75, "tags": ["UNESCO", "Mughal", "garden"], "is_indoor": False},
        {"name": "Lodhi Garden", "category": "attraction", "location": "Lodhi Road, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["park", "heritage", "morning walk"], "is_indoor": False},
        {"name": "Red Fort", "category": "attraction", "location": "Chandni Chowk, Delhi",
         "entry_fee": 35.0, "avg_duration_minutes": 120, "tags": ["UNESCO", "Mughal", "history"], "is_indoor": False},
        {"name": "Akshardham Temple", "category": "attraction", "location": "Noida More, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 180, "tags": ["spiritual", "architecture"], "is_indoor": False},
    ],
    # ── Indoor Alternatives ──────────────────────────────────────────────
    "delhi:indoor": [
        {"name": "National Museum", "category": "indoor", "location": "Janpath, New Delhi",
         "entry_fee": 20.0, "avg_duration_minutes": 120, "tags": ["museum", "history", "art"], "is_indoor": True},
        {"name": "Crafts Museum", "category": "indoor", "location": "Pragati Maidan, Delhi",
         "entry_fee": 20.0, "avg_duration_minutes": 90, "tags": ["crafts", "culture", "hands-on"], "is_indoor": True},
        {"name": "National Rail Museum", "category": "indoor", "location": "Chanakyapuri, Delhi",
         "entry_fee": 50.0, "avg_duration_minutes": 90, "tags": ["museum", "trains", "kids"], "is_indoor": True},
        {"name": "Indira Gandhi Memorial Museum", "category": "indoor", "location": "Safdarjung Road, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["museum", "history", "political"], "is_indoor": True},
        {"name": "DLF Promenade Mall", "category": "indoor", "location": "Vasant Kunj, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 120, "tags": ["shopping", "food court", "AC"], "is_indoor": True},
        {"name": "Select Citywalk", "category": "indoor", "location": "Saket, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 120, "tags": ["shopping", "food", "cinema"], "is_indoor": True},
    ],
    # ── Local Markets ────────────────────────────────────────────────────
    "delhi:market": [
        {"name": "Chandni Chowk Market", "category": "market", "location": "Old Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 120, "tags": ["street food", "spices", "textiles", "local"], "is_indoor": False},
        {"name": "Dilli Haat", "category": "market", "location": "INA, South Delhi",
         "entry_fee": 30.0, "avg_duration_minutes": 90, "tags": ["handicrafts", "regional food", "cultural"], "is_indoor": False},
        {"name": "Sarojini Nagar Market", "category": "market", "location": "Sarojini Nagar, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["fashion", "budget shopping", "street food"], "is_indoor": False},
        {"name": "Lajpat Nagar Central Market", "category": "market", "location": "Lajpat Nagar, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 75, "tags": ["clothing", "street food", "local vibe"], "is_indoor": False},
        {"name": "Khan Market", "category": "market", "location": "Khan Market, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["upscale", "books", "cafes", "boutique"], "is_indoor": False},
    ],
    # ── Cafes & Restaurants ──────────────────────────────────────────────
    "delhi:cafe": [
        {"name": "Khan Chacha", "category": "cafe", "location": "Khan Market, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 45, "tags": ["Mughlai", "rolls", "kebabs", "local icon"], "is_indoor": True},
        {"name": "Cafe Lota", "category": "cafe", "location": "Crafts Museum, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["Indian fusion", "breakfast", "outdoor seating"], "is_indoor": False},
        {"name": "Indian Accent", "category": "cafe", "location": "The Lodhi Hotel, Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 90, "tags": ["fine dining", "modern Indian", "upscale"], "is_indoor": True},
        {"name": "Paranthe Wali Gali", "category": "cafe", "location": "Chandni Chowk, Old Delhi",
         "entry_fee": 0.0, "avg_duration_minutes": 30, "tags": ["street food", "parathas", "heritage", "budget"], "is_indoor": False},
        {"name": "Mamagoto", "category": "cafe", "location": "Khan Market / Connaught Place",
         "entry_fee": 0.0, "avg_duration_minutes": 60, "tags": ["Pan-Asian", "noodles", "casual"], "is_indoor": True},
        {"name": "SodaBottleOpenerWala", "category": "cafe", "location": "Cyber Hub, Gurugram / Khan Market",
         "entry_fee": 0.0, "avg_duration_minutes": 75, "tags": ["Parsi food", "unique", "brunch"], "is_indoor": True},
    ],
}


def _interest_score(place: dict, interests: list[str]) -> int:
    """Returns how many user interests match the place's tags."""
    if not interests:
        return 0
    place_tags = {t.lower() for t in place.get("tags", [])}
    return sum(1 for interest in interests if interest.lower() in place_tags)


async def find_places(
    destination: str,
    category: str = "attraction",
    interests: list[str] | None = None,
    count: int = 6,
) -> PlacesResult:
    """
    MCP Tool Handler — find_places

    Args:
        destination: City/destination name (e.g. "Delhi").
        category:    One of: attraction, indoor, market, cafe.
        interests:   User interests to boost matching places (e.g. ["history", "food"]).
        count:       Number of unique places to generate.

    Returns:
        PlacesResult with a ranked list of PlaceItem entries.
    """
    interests = interests or []
    logger.info(
        f"[find_places] destination='{destination}' category='{category}' "
        f"interests={interests} count={count}"
    )

    cat_key = category.lower()
    lookup_key = f"{destination.lower()}:{cat_key}"

    # If the lookup key is in the catalogue, return it. Otherwise, generate dynamically using LLM.
    if lookup_key in _PLACES_CATALOGUE:
        raw_places = _PLACES_CATALOGUE[lookup_key]
    elif f"{destination.lower().split(',')[0].strip()}:{cat_key}" in _PLACES_CATALOGUE:
        raw_places = _PLACES_CATALOGUE[f"{destination.lower().split(',')[0].strip()}:{cat_key}"]
    else:
        import json
        from ai_service.services.llm_service import llm_service
        try:
            logger.info(f"Destination '{destination}' not in catalog. Requesting custom places from LLM...")
            prompt = f"""Generate a list of {count} real and popular '{category}' options in '{destination}'.
Return ONLY a valid JSON object matching this schema (do not wrap in markdown or any other explanation):
{{
  "places": [
    {{
      "name": "Name of the place/attraction/cafe",
      "category": "{category}",
      "location": "Specific location or address in {destination}",
      "entry_fee": 0.0,
      "avg_duration_minutes": 90,
      "tags": ["tag1", "tag2"],
      "is_indoor": false
    }}
  ]
}}"""
            response_text = await llm_service.generate_response(
                prompt=prompt,
                system_instruction="You are a helpful travel assistant. Always reply with raw valid JSON matching the requested schema. No conversational preamble.",
                structured_json=True
            )
            
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
                
            data = json.loads(cleaned_text)
            if isinstance(data, dict) and "places" in data:
                raw_places = data["places"]
            elif isinstance(data, list):
                raw_places = data
            else:
                raise ValueError("Unexpected JSON structure returned from LLM")

            normalized = []
            for item in raw_places:
                if isinstance(item, dict):
                    normalized.append({
                        "name": item.get("name") or "Sight",
                        "category": item.get("category") or category,
                        "location": item.get("location") or destination,
                        "entry_fee": float(item.get("entry_fee") or 0.0),
                        "avg_duration_minutes": int(item.get("avg_duration_minutes") or 90),
                        "tags": item.get("tags") or [],
                        "is_indoor": bool(item.get("is_indoor") or False)
                    })
                elif isinstance(item, str):
                    normalized.append({
                        "name": item,
                        "category": category,
                        "location": destination,
                        "entry_fee": 0.0,
                        "avg_duration_minutes": 90,
                        "tags": [],
                        "is_indoor": False
                    })
            raw_places = normalized
            logger.info(f"Successfully generated and normalized {len(raw_places)} custom places for '{destination}' using LLM.")
        except Exception as e:
            logger.error(f"Failed to generate custom places from LLM: {str(e)}. Falling back to Delhi catalogue.")
            raw_places = _PLACES_CATALOGUE.get(f"delhi:{cat_key}", [])

    # Sort by interest match score (descending), preserving original order on ties
    scored = sorted(raw_places, key=lambda p: _interest_score(p, interests), reverse=True)

    places = [PlaceItem(**p) for p in scored]

    logger.info(f"[find_places] Returning {len(places)} places for category='{category}' in '{destination}'")
    return PlacesResult(destination=destination, category=category, places=places)
