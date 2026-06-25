"""
MCP Tool: calculate_distance
Returns estimated distance and travel time between two checkpoints.
Mock implementation — ready to swap for a live Maps API (e.g., Google Distance Matrix).
"""
import logging
from ai_service.schemas.domain import DistanceResult

logger = logging.getLogger("mcp.distance_tool")

# ---------------------------------------------------------------------------
# Pre-computed mock distance matrix for common Delhi landmark pairs.
# Keys are frozensets of the two location strings (order-insensitive).
# Each value is a dict keyed by transport mode.
# ---------------------------------------------------------------------------
_DISTANCE_MATRIX: dict[frozenset, dict[str, dict]] = {
    frozenset({"india gate", "qutub minar"}): {
        "metro": {"distance_km": 14.2, "duration_minutes": 42, "estimated_cost": 40},
        "auto":  {"distance_km": 14.2, "duration_minutes": 35, "estimated_cost": 180},
        "walk":  {"distance_km": 14.2, "duration_minutes": 180, "estimated_cost": 0},
    },
    frozenset({"india gate", "red fort"}): {
        "metro": {"distance_km": 9.0, "duration_minutes": 28, "estimated_cost": 30},
        "auto":  {"distance_km": 9.0, "duration_minutes": 22, "estimated_cost": 120},
        "walk":  {"distance_km": 9.0, "duration_minutes": 110, "estimated_cost": 0},
    },
    frozenset({"india gate", "lodhi garden"}): {
        "metro": {"distance_km": 4.5, "duration_minutes": 18, "estimated_cost": 20},
        "auto":  {"distance_km": 4.5, "duration_minutes": 12, "estimated_cost": 70},
        "walk":  {"distance_km": 4.5, "duration_minutes": 55, "estimated_cost": 0},
    },
    frozenset({"lodhi garden", "humayun's tomb"}): {
        "metro": {"distance_km": 3.2, "duration_minutes": 15, "estimated_cost": 20},
        "auto":  {"distance_km": 3.2, "duration_minutes": 10, "estimated_cost": 60},
        "walk":  {"distance_km": 3.2, "duration_minutes": 40, "estimated_cost": 0},
    },
    frozenset({"red fort", "chandni chowk"}): {
        "metro": {"distance_km": 1.1, "duration_minutes": 8, "estimated_cost": 15},
        "auto":  {"distance_km": 1.1, "duration_minutes": 6, "estimated_cost": 40},
        "walk":  {"distance_km": 1.1, "duration_minutes": 14, "estimated_cost": 0},
    },
    frozenset({"connaught place", "karol bagh"}): {
        "metro": {"distance_km": 5.0, "duration_minutes": 15, "estimated_cost": 20},
        "auto":  {"distance_km": 5.0, "duration_minutes": 18, "estimated_cost": 80},
        "walk":  {"distance_km": 5.0, "duration_minutes": 62, "estimated_cost": 0},
    },
    frozenset({"paharganj", "connaught place"}): {
        "metro": {"distance_km": 2.5, "duration_minutes": 10, "estimated_cost": 15},
        "auto":  {"distance_km": 2.5, "duration_minutes": 8, "estimated_cost": 50},
        "walk":  {"distance_km": 2.5, "duration_minutes": 30, "estimated_cost": 0},
    },
}

# Default fallback for unknown pairs (generic city-hop estimate)
_DEFAULT_DISTANCES: dict[str, dict] = {
    "metro": {"distance_km": 8.0, "duration_minutes": 25, "estimated_cost": 30},
    "auto":  {"distance_km": 8.0, "duration_minutes": 20, "estimated_cost": 100},
    "walk":  {"distance_km": 8.0, "duration_minutes": 100, "estimated_cost": 0},
}


def _lookup(origin: str, destination: str, mode: str) -> dict:
    """Looks up the distance matrix; falls back to default on miss."""
    pair = frozenset({origin.lower(), destination.lower()})
    matrix_entry = _DISTANCE_MATRIX.get(pair, {})
    return matrix_entry.get(mode.lower(), _DEFAULT_DISTANCES.get(mode.lower(), _DEFAULT_DISTANCES["auto"]))


async def calculate_distance(
    origin: str,
    destination: str,
    mode: str = "metro",
) -> DistanceResult:
    """
    MCP Tool Handler — calculate_distance

    Args:
        origin:      Starting location name (e.g. "India Gate").
        destination: Target location name (e.g. "Qutub Minar").
        mode:        Transport mode — metro / auto / walk.

    Returns:
        DistanceResult with distance_km, duration_minutes, and estimated_cost (INR).
    """
    logger.info(
        f"[calculate_distance] '{origin}' → '{destination}' via '{mode}'"
    )

    data = _lookup(origin, destination, mode)

    result = DistanceResult(
        origin=origin,
        destination=destination,
        mode=mode,
        distance_km=data["distance_km"],
        duration_minutes=data["duration_minutes"],
        estimated_cost=data["estimated_cost"],
    )

    logger.info(
        f"[calculate_distance] {result.distance_km} km, "
        f"{result.duration_minutes} min, ₹{result.estimated_cost}"
    )
    return result
