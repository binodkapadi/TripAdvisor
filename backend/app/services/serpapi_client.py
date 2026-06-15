from __future__ import annotations

from typing import Any

import httpx

from ..core.config import settings


async def autocomplete_places(query: str, kind: str = "origin") -> list[dict[str, Any]]:
    if not settings.SERPAPI_KEY:
        # Fallback: return empty suggestions if SerpAPI not configured.
        return []

    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google_autocomplete",
        "q": query,
        "api_key": settings.SERPAPI_KEY,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    preds = data.get("predictions") or []
    # Normalize to {description: ...}
    out: list[dict[str, Any]] = []
    for p in preds:
        out.append(
            {
                "description": p.get("description") or p.get("matched_substrings") or p.get("place_id") or str(p),
                "placeId": p.get("place_id") or p.get("placeId"),
                **p,
            }
        )
    return out


async def search_hotel_image(query: str) -> str | None:
    if not settings.SERPAPI_KEY:
        return None

    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google",
        "q": query,
        "tbm": "isch",
        "api_key": settings.SERPAPI_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            
        images = data.get("images_results") or []
        for img in images:
            original = img.get("original")
            if original and isinstance(original, str) and original.startswith("http"):
                return original
    except Exception as e:
        print(f"Error fetching hotel image for {query}: {e}")
        
    return None


async def search_web(query: str) -> str:
    if settings.TAVILY_API_KEY:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "max_results": 3,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(url, json=payload)
                r.raise_for_status()
                data = r.json()
            results = [res["content"] for res in data.get("results", [])]
            if results:
                return "\n".join(results)
        except Exception as e:
            print(f"Tavily search error/exhausted: {e}")

    # Fallback to Serper if Tavily fails or is missing
    if settings.SERPER_API_KEY:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": settings.SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {"q": query}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(url, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
            results = []
            if "answerBox" in data and "answer" in data["answerBox"]:
                results.append(data["answerBox"]["answer"])
            elif "answerBox" in data and "snippet" in data["answerBox"]:
                results.append(data["answerBox"]["snippet"])
            for res in data.get("organic", [])[:3]:
                if "snippet" in res:
                    results.append(res["snippet"])
            if results:
                return "\n".join(results)
        except Exception as e:
            print(f"Serper search error: {e}")

    return "No live search results available."


async def search_hotels(destination: str, check_in: str, check_out: str, adults: int = 1) -> str:
    """Fetches real hotel data from Google Hotels via SerpAPI."""
    if not settings.SERPAPI_KEY:
        return "SerpAPI key not configured. Using fallback estimations."

    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google_hotels",
        "q": destination,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "adults": adults,
        "currency": "USD",
        "api_key": settings.SERPAPI_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        properties = data.get("properties") or []
        if not properties:
            return f"No hotels found in {destination} for the given dates."

        hotel_list = []
        for prop in properties[:5]:  # Get top 5 hotels
            name = prop.get("name", "Unknown Hotel")
            # Extract rate correctly (Google Hotels API usually provides "rate_per_night" or "total_rate")
            price = prop.get("rate_per_night", {}).get("lowest", "N/A")
            if price == "N/A":
                price = prop.get("total_rate", {}).get("lowest", "N/A")
            rating = prop.get("overall_rating", "N/A")
            link = prop.get("link", "")
            hotel_list.append(f"- {name}: ${price}/night (Rating: {rating}) [Link: {link}]")

        if hotel_list:
            return f"Live Hotel Data for {destination} ({check_in} to {check_out}):\n" + "\n".join(hotel_list)
        return f"No specific hotel pricing details found for {destination}."
    except Exception as e:
        print(f"SerpAPI Hotels error: {e}")
        return f"Could not fetch live hotel data for {destination} due to an error."
