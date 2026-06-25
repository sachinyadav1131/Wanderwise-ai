"""
MCP Tool: check_weather
Returns weather conditions for a given location and date.
Mock implementation — ready to swap for a live Weather API (e.g., OpenWeatherMap).
"""
import logging
from ai_service.schemas.domain import WeatherResult

logger = logging.getLogger("mcp.weather_tool")

# ---------------------------------------------------------------------------
# Deterministic mock data — keyed by lowercase location keyword.
# In production, replace with an async HTTP call to a weather provider.
# ---------------------------------------------------------------------------
_WEATHER_PROFILES: dict[str, dict] = {
    "lodhi garden": {
        "condition": "Rainy",
        "precipitation_pct": 78,
        "temperature_celsius": 29.5,
        "wind_kmh": 18.0,
        "advisory": "Avoid outdoor activities. Carry umbrella or seek indoor alternatives.",
    },
    "india gate": {
        "condition": "Partly Cloudy",
        "precipitation_pct": 25,
        "temperature_celsius": 33.0,
        "wind_kmh": 12.0,
        "advisory": "Carry water. Morning visits recommended.",
    },
    "qutub minar": {
        "condition": "Sunny",
        "precipitation_pct": 5,
        "temperature_celsius": 36.0,
        "wind_kmh": 8.0,
        "advisory": "Avoid peak afternoon heat. Best visited before 10 AM.",
    },
    "red fort": {
        "condition": "Partly Cloudy",
        "precipitation_pct": 20,
        "temperature_celsius": 32.0,
        "wind_kmh": 10.0,
        "advisory": None,
    },
    "humayun's tomb": {
        "condition": "Sunny",
        "precipitation_pct": 10,
        "temperature_celsius": 34.0,
        "wind_kmh": 9.0,
        "advisory": None,
    },
}

_DEFAULT_WEATHER = {
    "condition": "Partly Cloudy",
    "precipitation_pct": 20,
    "temperature_celsius": 31.0,
    "wind_kmh": 11.0,
    "advisory": None,
}


async def check_weather(location: str, date: str) -> WeatherResult:
    """
    MCP Tool Handler — check_weather

    Args:
        location: Name of the place/area (e.g. "Lodhi Garden", "India Gate").
        date:     ISO date string (e.g. "2026-06-21"). Used for logging context.

    Returns:
        WeatherResult with condition, precipitation, temperature, wind, and advisory.
    """
    logger.info(f"[check_weather] location='{location}' date='{date}'")

    # Match by checking if any profile key appears in the location string
    profile = _DEFAULT_WEATHER
    for key, data in _WEATHER_PROFILES.items():
        if key in location.lower():
            profile = data
            break

    result = WeatherResult(
        location=location,
        date=date,
        condition=profile["condition"],
        precipitation_pct=profile["precipitation_pct"],
        temperature_celsius=profile["temperature_celsius"],
        wind_kmh=profile["wind_kmh"],
        advisory=profile.get("advisory"),
    )

    logger.info(
        f"[check_weather] Result → {result.condition}, "
        f"{result.precipitation_pct}% rain, {result.temperature_celsius}°C"
    )
    return result
