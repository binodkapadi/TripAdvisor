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
