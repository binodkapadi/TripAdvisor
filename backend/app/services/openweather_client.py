from __future__ import annotations

import httpx

from ..core.config import settings


def _extract_first_city_name(location: str) -> str:
    # Try to use the first token as a quick fallback for OpenWeather's "q" param.
    return location.split(",")[0].strip()


async def get_weather_insights(destination: str, start_date: str, end_date: str) -> str:
    if not settings.OPENWEATHER_API_KEY:
        return f"Weather insights for {destination} (traveling {start_date} to {end_date}): Unavailable. Pack light layers and prepare for possible changes. Consider checking local forecasts closer to departure."

    city = _extract_first_city_name(destination)
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, params=params)

        if r.status_code != 200:
            return f"Real-time weather data unavailable for {destination}. Traveling {start_date} to {end_date}. Consider checking local weather forecasts closer to your travel dates."

        data = r.json()
        temp_c = data.get("main", {}).get("temp")
        temp_min = data.get("main", {}).get("temp_min")
        temp_max = data.get("main", {}).get("temp_max")
        desc = data.get("weather", [{}])[0].get("description")
        humidity = data.get("main", {}).get("humidity")
        feels = data.get("main", {}).get("feels_like")
        
        return (
            f"Weather for {destination} (traveling {start_date} to {end_date}):\n"
            f"Current conditions: {desc.capitalize()}. "
            f"Temperature: {temp_c}°C (range: {temp_min}–{temp_max}°C, feels like {feels}°C). "
            f"Humidity: {humidity}%. "
            f"Plan for comfort: bring appropriate layers and water-resistant items if needed. "
            f"Check daily forecasts as your travel dates approach."
        )
    except Exception as e:
        return f"Weather service temporarily unavailable for {destination}. Traveling {start_date} to {end_date}. Please check local weather forecasts closer to your departure date."

