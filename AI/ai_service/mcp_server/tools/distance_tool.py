"""
MCP Tool: calculate_distance
Returns real-time distance and travel duration between two checkpoints using
Google Maps Distance Matrix API (with automatic Haversine fallback).
"""
import logging
from ai_service.schemas.domain import DistanceResult
from ai_service.services.distance_service import distance_service

logger = logging.getLogger("mcp.distance_tool")


async def calculate_distance(
    origin: str,
    destination: str,
    mode: str = "metro",
) -> DistanceResult:
    """
    MCP Tool Handler — calculate_distance

    Args:
        origin:      Starting location name or coordinate string.
        destination: Target location name or coordinate string.
        mode:        Transport mode — metro / auto / cab / walk.

    Returns:
        DistanceResult with distance_km, duration_minutes, and estimated_cost (INR).
    """
    logger.info(
        f"[calculate_distance] '{origin}' → '{destination}' via '{mode}'"
    )

    data = await distance_service.get_distance_and_duration(origin, destination, mode)

    result = DistanceResult(
        origin=origin,
        destination=destination,
        mode=mode,
        distance_km=data["distance_km"],
        duration_minutes=data["duration_minutes"],
        estimated_cost=data["estimated_cost"],
    )

    logger.info(
        f"[calculate_distance] [{data.get('source')}] {result.distance_km} km, "
        f"{result.duration_minutes} min, ₹{result.estimated_cost}"
    )
    return result

