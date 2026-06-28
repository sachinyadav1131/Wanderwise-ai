"""
MCP Tool: check_weather
Fetches live weather data from the OpenWeatherMap Current Weather API.
Falls back to a deterministic estimate if the API key is not configured or
if the network call fails, so the MCP server never crashes on weather queries.

Free-tier endpoint used:
    https://api.openweathermap.org/data/2.5/weather
    (requires a free API key from https://openweathermap.org/api)

Set OPENWEATHERMAP_API_KEY in your .env to enable live lookups.
"""

import logging
import math
from datetime import datetime

import httpx

from ai_service.schemas.domain import WeatherResult
from ai_service.config.settings import settings

logger = logging.getLogger("mcp.weather_tool")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_OWM_URL = "https://api.openweathermap.org/data/2.5/weather"
_REQUEST_TIMEOUT_S = 8.0  # seconds

# OWM condition code → human-readable label
_CONDITION_MAP: dict[str, str] = {
    "Thunderstorm": "Thunderstorm",
    "Drizzle": "Drizzle",
    "Rain": "Rainy",
    "Snow": "Snowy",
    "Mist": "Misty",
    "Smoke": "Smoky",
    "Haze": "Hazy",
    "Dust": "Dusty",
    "Fog": "Foggy",
    "Sand": "Dusty",
    "Ash": "Hazy",
    "Squall": "Windy",
    "Tornado": "Tornado",
    "Clear": "Sunny",
    "Clouds": "Cloudy",
}

# Precipitation chance heuristics by OWM weather group (no free-tier rain %)
_PRECIP_ESTIMATE: dict[str, int] = {
    "Thunderstorm": 90,
    "Drizzle": 65,
    "Rain": 80,
    "Snow": 70,
    "Mist": 40,
    "Smoke": 5,
    "Haze": 10,
    "Dust": 5,
    "Fog": 35,
    "Sand": 5,
    "Ash": 5,
    "Squall": 60,
    "Tornado": 85,
    "Clear": 5,
    "Clouds": 25,
}

# Advisory templates
_ADVISORY_TEMPLATES: dict[str, str] = {
    "Thunderstorm": "Avoid outdoor activities. Seek shelter immediately.",
    "Drizzle": "Light rain expected. Carry a compact umbrella.",
    "Rainy": "Carry an umbrella. Plan indoor backup activities.",
    "Snowy": "Dress in warm layers. Roads may be slippery.",
    "Foggy": "Reduced visibility — drive carefully.",
    "Misty": "Expect low visibility in the early morning.",
    "Hazy": "Air quality may be poor. Sensitive travellers should wear a mask.",
    "Dusty": "Dust conditions. Keep eyes and nose protected.",
    "Tornado": "Dangerous conditions. Avoid all outdoor activities.",
    "Sunny": "High UV index likely. Apply sunscreen and carry water.",
    "Cloudy": "Comfortable conditions. A light jacket may be useful.",
    "Windy": "Strong gusts expected. Secure loose belongings.",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _kelvin_to_celsius(k: float) -> float:
    return round(k - 273.15, 1)


def _build_advisory(condition: str, temp_c: float) -> str | None:
    """Return a contextual travel advisory string, or None if conditions are benign."""
    advisory = _ADVISORY_TEMPLATES.get(condition)
    if temp_c >= 38:
        heat_note = "Extreme heat — stay hydrated and avoid midday sun."
        advisory = f"{advisory}. {heat_note}" if advisory else heat_note
    elif temp_c <= 5:
        cold_note = "Very cold — wear thermal clothing."
        advisory = f"{advisory}. {cold_note}" if advisory else cold_note
    return advisory


def _fallback_weather(location: str, date: str) -> WeatherResult:
    """
    Return a deterministic 'best-guess' weather result when the live API
    is unavailable.  Uses the current month to season-adjust for northern India.
    """
    month = datetime.now().month
    # Simple northern-hemisphere seasonal defaults
    if 3 <= month <= 5:   # Spring
        temp, condition, precip, wind = 28.0, "Partly Cloudy", 15, 12.0
    elif 6 <= month <= 9:  # Monsoon / Summer
        temp, condition, precip, wind = 32.0, "Rainy", 70, 18.0
    elif 10 <= month <= 11:  # Autumn
        temp, condition, precip, wind = 24.0, "Sunny", 8, 10.0
    else:                   # Winter
        temp, condition, precip, wind = 16.0, "Cloudy", 10, 8.0

    return WeatherResult(
        location=location,
        date=date,
        condition=condition,
        precipitation_pct=precip,
        temperature_celsius=temp,
        wind_kmh=wind,
        advisory=_build_advisory(condition, temp),
    )


# ---------------------------------------------------------------------------
# Public MCP tool handler
# ---------------------------------------------------------------------------

async def check_weather(location: str, date: str) -> WeatherResult:
    """
    MCP Tool Handler — check_weather

    Args:
        location: Name of the place/area (e.g. "Lodhi Garden, Delhi").
        date:     ISO date string (e.g. "2026-06-21"). Used for logging context.

    Returns:
        WeatherResult with condition, precipitation, temperature, wind, advisory.

    Behaviour:
        1. If OPENWEATHERMAP_API_KEY is set, performs a live HTTP GET.
        2. On network error / timeout / missing key, falls back to a
           season-adjusted deterministic estimate so the agent workflow
           is never hard-blocked by weather data unavailability.
    """
    logger.info(f"[check_weather] location='{location}' date='{date}'")

    owm_key = settings.openweathermap_api_key
    if not owm_key:
        logger.warning(
            "[check_weather] OPENWEATHERMAP_API_KEY not set — "
            "using seasonal fallback estimate."
        )
        return _fallback_weather(location, date)

    params = {
        "q": location,
        "appid": owm_key,
        "units": "metric",  # Celsius, m/s wind
    }

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT_S) as client:
            resp = await client.get(_OWM_URL, params=params)
            resp.raise_for_status()
            data: dict = resp.json()

    except httpx.TimeoutException:
        logger.warning(
            f"[check_weather] OWM request timed out after {_REQUEST_TIMEOUT_S}s "
            f"for '{location}'. Using fallback."
        )
        return _fallback_weather(location, date)

    except httpx.HTTPStatusError as exc:
        logger.warning(
            f"[check_weather] OWM returned HTTP {exc.response.status_code} "
            f"for '{location}'. Using fallback."
        )
        return _fallback_weather(location, date)

    except Exception as exc:
        logger.error(
            f"[check_weather] Unexpected error fetching weather for "
            f"'{location}': {exc}. Using fallback.",
            exc_info=True,
        )
        return _fallback_weather(location, date)

    # -----------------------------------------------------------------------
    # Map OWM JSON response → WeatherResult
    # -----------------------------------------------------------------------
    try:
        weather_group: str = data["weather"][0]["main"]       # e.g. "Rain"
        condition = _CONDITION_MAP.get(weather_group, weather_group)

        temp_c: float = round(data["main"]["temp"], 1)        # already in °C (units=metric)
        wind_ms: float = data["wind"].get("speed", 0.0)       # m/s
        wind_kmh: float = round(wind_ms * 3.6, 1)            # convert to km/h

        # rain / snow volume in last 1h (mm) — proxy for precipitation %
        rain_1h = data.get("rain", {}).get("1h", 0.0)
        snow_1h = data.get("snow", {}).get("1h", 0.0)
        if rain_1h or snow_1h:
            # Scale 0–10 mm → 0–100 %; cap at 100
            precip_pct = min(100, int((rain_1h + snow_1h) * 10))
        else:
            precip_pct = _PRECIP_ESTIMATE.get(weather_group, 20)

        advisory = _build_advisory(condition, temp_c)

        result = WeatherResult(
            location=location,
            date=date,
            condition=condition,
            precipitation_pct=precip_pct,
            temperature_celsius=temp_c,
            wind_kmh=wind_kmh,
            advisory=advisory,
        )

    except (KeyError, IndexError, TypeError) as exc:
        logger.error(
            f"[check_weather] Failed to parse OWM response for '{location}': {exc}. "
            f"Raw response keys: {list(data.keys())}. Using fallback.",
            exc_info=True,
        )
        return _fallback_weather(location, date)

    logger.info(
        f"[check_weather] Live result → {result.condition}, "
        f"{result.precipitation_pct}% rain, {result.temperature_celsius}°C, "
        f"{result.wind_kmh} km/h wind"
    )
    return result
