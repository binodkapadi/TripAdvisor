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
