"""
DistanceService — Google Distance Matrix API Integration with fallback logic.

Supports:
- Async real-time distance and duration lookups via Google Maps Distance Matrix API.
- Mode mapping (metro/cab/auto/driving -> driving/transit, walk -> walking).
- Automatic fallback to Haversine formula calculation if GOOGLE_MAPS_API_KEY is missing or API errors out.
"""
import logging
import math
import httpx
from typing import Any, Optional
from ai_service.config.settings import settings

logger = logging.getLogger("services.distance_service")


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates great-circle distance in kilometers between two GPS coordinates."""
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


class DistanceService:
    def __init__(self):
        self.api_url = "https://maps.googleapis.com/maps/api/distancematrix/json"

    def _map_mode(self, mode: str) -> str:
        m = (mode or "cab").lower().strip()
        if m in ("walk", "walking"):
            return "walking"
        elif m in ("metro", "subway", "transit", "bus", "train"):
            return "transit"
        elif m in ("bicycling", "cycle", "bike"):
            return "bicycling"
        else:
            # cab, auto, taxi, car, driving
            return "driving"

    def _get_api_key(self) -> str:
        import os
        return (
            getattr(settings, "google_maps_api_key", "")
            or os.environ.get("GOOGLE_MAPS_API_KEY", "")
            or os.environ.get("GOOGLE_DISTANCE_MATRIX_API_KEY", "")
        ).strip()

    async def get_distance_and_duration(
        self,
        origin: str | dict[str, Any],
        destination: str | dict[str, Any],
        mode: str = "driving",
    ) -> dict[str, Any]:
        """
        Fetches distance (km) and travel duration (minutes) between origin and destination.

        Parameters:
        - origin: String address ("India Gate, Delhi") OR dict {"lat": 28.61, "lng": 77.22}
        - destination: String address OR dict {"lat": 28.52, "lng": 77.18}
        - mode: Transport mode (cab, auto, metro, walk, driving, etc.)

        Returns dict:
        {
            "distance_km": float,
            "duration_minutes": int,
            "estimated_cost": float,
            "source": "google_distance_matrix" | "haversine_fallback",
            "mode": str
        }
        """
        api_key = self._get_api_key()
        google_mode = self._map_mode(mode)

        # Format origin and destination as strings for API call
        if isinstance(origin, dict):
            lat = origin.get("lat") or origin.get("latitude")
            lng = origin.get("lng") or origin.get("longitude")
            origin_str = f"{lat},{lng}" if (lat is not None and lng is not None) else str(origin.get("name") or origin.get("location") or "")
        else:
            origin_str = str(origin)

        if isinstance(destination, dict):
            lat = destination.get("lat") or destination.get("latitude")
            lng = destination.get("lng") or destination.get("longitude")
            dest_str = f"{lat},{lng}" if (lat is not None and lng is not None) else str(destination.get("name") or destination.get("location") or "")
        else:
            dest_str = str(destination)

        # ── 1. Try Google Distance Matrix API if key is available ────────────
        if api_key and origin_str and dest_str:
            try:
                params = {
                    "origins": origin_str,
                    "destinations": dest_str,
                    "mode": google_mode,
                    "key": api_key,
                }
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(self.api_url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("status") == "OK" and data.get("rows"):
                            element = data["rows"][0]["elements"][0]
                            if element.get("status") == "OK":
                                dist_meters = element["distance"]["value"]
                                dur_seconds = element["duration"]["value"]

                                distance_km = round(dist_meters / 1000.0, 1)
                                duration_minutes = max(1, math.ceil(dur_seconds / 60.0))

                                # Estimated cost logic (INR heuristic)
                                if google_mode == "walking":
                                    cost = 0.0
                                elif google_mode == "transit":
                                    cost = round(max(15.0, distance_km * 3.0), 0)
                                else:
                                    # Cab / auto
                                    cost = round(max(50.0, distance_km * 18.0), 0)

                                logger.info(
                                    f"[Google Distance Matrix] {origin_str} → {dest_str} "
                                    f"({google_mode}): {distance_km} km, {duration_minutes} min, ₹{cost}"
                                )
                                return {
                                    "distance_km": distance_km,
                                    "duration_minutes": duration_minutes,
                                    "estimated_cost": cost,
                                    "source": "google_distance_matrix",
                                    "mode": mode,
                                }
                            else:
                                logger.warning(f"[Google Distance Matrix] Element status: {element.get('status')}")
                        else:
                            logger.warning(f"[Google Distance Matrix] API status: {data.get('status')}")
            except Exception as e:
                logger.error(f"[Google Distance Matrix API Error] {e}. Falling back to Haversine calculation.")

        # ── 2. Fallback: Coordinate-based Haversine calculation ──────────────
        lat1, lng1 = self._extract_coords(origin)
        lat2, lng2 = self._extract_coords(destination)

        if lat1 is not None and lng1 is not None and lat2 is not None and lng2 is not None:
            dist_km = haversine_km(lat1, lng1, lat2, lng2)
        else:
            dist_km = 5.0  # Generic fallback distance

        dist_km = round(dist_km, 1)

        if google_mode == "walking":
            dur_min = max(5, int(dist_km * 12))  # ~5 km/h walking speed
            cost = 0.0
        elif google_mode == "transit":
            dur_min = max(10, int(dist_km * 4))  # ~15 km/h transit speed
            cost = round(max(15.0, dist_km * 3.0), 0)
        else:
            dur_min = max(10, int(dist_km * 3.5))  # ~17 km/h urban driving speed
            cost = round(max(50.0, dist_km * 18.0), 0)

        logger.info(
            f"[Haversine Fallback] {origin_str} → {dest_str}: {dist_km} km, {dur_min} min"
        )
        return {
            "distance_km": dist_km,
            "duration_minutes": dur_min,
            "estimated_cost": cost,
            "source": "haversine_fallback",
            "mode": mode,
        }

    def get_distance_and_duration_sync(
        self,
        origin: str | dict[str, Any],
        destination: str | dict[str, Any],
        mode: str = "driving",
    ) -> dict[str, Any]:
        """Synchronous version of get_distance_and_duration."""
        api_key = self._get_api_key()
        google_mode = self._map_mode(mode)

        if isinstance(origin, dict):
            lat = origin.get("lat") or origin.get("latitude")
            lng = origin.get("lng") or origin.get("longitude")
            origin_str = f"{lat},{lng}" if (lat is not None and lng is not None) else str(origin.get("name") or origin.get("location") or "")
        else:
            origin_str = str(origin)

        if isinstance(destination, dict):
            lat = destination.get("lat") or destination.get("latitude")
            lng = destination.get("lng") or destination.get("longitude")
            dest_str = f"{lat},{lng}" if (lat is not None and lng is not None) else str(destination.get("name") or destination.get("location") or "")
        else:
            dest_str = str(destination)

        if api_key and origin_str and dest_str:
            try:
                params = {
                    "origins": origin_str,
                    "destinations": dest_str,
                    "mode": google_mode,
                    "key": api_key,
                }
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(self.api_url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("status") == "OK" and data.get("rows"):
                            element = data["rows"][0]["elements"][0]
                            if element.get("status") == "OK":
                                dist_meters = element["distance"]["value"]
                                dur_seconds = element["duration"]["value"]
                                distance_km = round(dist_meters / 1000.0, 1)
                                duration_minutes = max(1, math.ceil(dur_seconds / 60.0))
                                cost = 0.0 if google_mode == "walking" else (round(max(15.0, distance_km * 3.0), 0) if google_mode == "transit" else round(max(50.0, distance_km * 18.0), 0))
                                return {
                                    "distance_km": distance_km,
                                    "duration_minutes": duration_minutes,
                                    "estimated_cost": cost,
                                    "source": "google_distance_matrix",
                                    "mode": mode,
                                }
            except Exception as e:
                logger.error(f"[Google Distance Matrix Sync Error] {e}")

        # Fallback to Haversine
        lat1, lng1 = self._extract_coords(origin)
        lat2, lng2 = self._extract_coords(destination)

        if lat1 is not None and lng1 is not None and lat2 is not None and lng2 is not None:
            dist_km = haversine_km(lat1, lng1, lat2, lng2)
        else:
            dist_km = 5.0

        dist_km = round(dist_km, 1)
        dur_min = max(5, int(dist_km * 12)) if google_mode == "walking" else (max(10, int(dist_km * 4)) if google_mode == "transit" else max(10, int(dist_km * 3.5)))
        cost = 0.0 if google_mode == "walking" else (round(max(15.0, dist_km * 3.0), 0) if google_mode == "transit" else round(max(50.0, dist_km * 18.0), 0))

        return {
            "distance_km": dist_km,
            "duration_minutes": dur_min,
            "estimated_cost": cost,
            "source": "haversine_fallback",
            "mode": mode,
        }

    def _extract_coords(self, loc: Any) -> tuple[Optional[float], Optional[float]]:
        if isinstance(loc, dict):
            lat = loc.get("lat") or loc.get("latitude")
            lng = loc.get("lng") or loc.get("longitude")
            try:
                if lat is not None and lng is not None:
                    return float(lat), float(lng)
            except (TypeError, ValueError):
                pass
        return None, None


distance_service = DistanceService()

