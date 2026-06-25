"""
MCP Tool: save_itinerary / update_itinerary
Persists or updates trip itinerary plans in an in-memory store.
Ready to swap for actual database writes (e.g., PostgreSQL via asyncpg / SQLAlchemy).
"""
import uuid
import logging
from typing import Any
from ai_service.schemas.domain import ItineraryResult

logger = logging.getLogger("mcp.itinerary_tool")

# ---------------------------------------------------------------------------
# In-memory itinerary store: { trip_id: { day_number: day_plan } }
# In production, replace these reads/writes with DB calls.
# ---------------------------------------------------------------------------
_itinerary_store: dict[str, dict[str, Any]] = {}


async def save_itinerary(
    trip_id: str,
    days: list[dict],
    metadata: dict | None = None,
) -> ItineraryResult:
    """
    MCP Tool Handler — save_itinerary

    Stores a full itinerary plan for a trip. If a plan already exists for
    this trip_id it is overwritten (use update_itinerary for partial updates).

    Args:
        trip_id:  Unique trip identifier.
        days:     List of day plan dicts, each containing dayNumber, activities, etc.
        metadata: Optional extra metadata to attach (destination, dates, budget, etc.).

    Returns:
        ItineraryResult confirming storage with operation = "saved".
    """
    logger.info(f"[save_itinerary] Saving {len(days)} day(s) for trip='{trip_id}'")

    _itinerary_store[trip_id] = {
        "days": {str(day.get("dayNumber", i + 1)): day for i, day in enumerate(days)},
        "metadata": metadata or {},
    }

    logger.info(f"[save_itinerary] Stored itinerary for trip='{trip_id}'")
    return ItineraryResult(
        trip_id=trip_id,
        operation="saved",
        days_stored=len(days),
        status="ok",
    )


async def update_itinerary(
    trip_id: str,
    day_number: int,
    updated_day: dict,
) -> ItineraryResult:
    """
    MCP Tool Handler — update_itinerary

    Partially updates a single day's plan within an existing itinerary.
    If no itinerary exists for the trip_id, a new one is created.

    Args:
        trip_id:     Unique trip identifier.
        day_number:  The day to update (1-indexed).
        updated_day: The new day plan dict to replace the existing entry.

    Returns:
        ItineraryResult confirming storage with operation = "updated".
    """
    logger.info(f"[update_itinerary] Updating day {day_number} for trip='{trip_id}'")

    if trip_id not in _itinerary_store:
        _itinerary_store[trip_id] = {"days": {}, "metadata": {}}

    _itinerary_store[trip_id]["days"][str(day_number)] = updated_day

    days_stored = len(_itinerary_store[trip_id]["days"])
    logger.info(
        f"[update_itinerary] Updated day {day_number}; "
        f"total days stored for trip='{trip_id}': {days_stored}"
    )
    return ItineraryResult(
        trip_id=trip_id,
        operation="updated",
        days_stored=days_stored,
        status="ok",
    )


def get_itinerary(trip_id: str) -> dict | None:
    """Helper — retrieve stored itinerary (used by server introspection / tests)."""
    return _itinerary_store.get(trip_id)
