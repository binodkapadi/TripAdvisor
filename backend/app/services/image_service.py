from datetime import datetime, timezone
import hashlib

from ..db.mongo import mongo
from .serpapi_client import search_hotel_image


def _cache_key(query: str) -> str:
    return hashlib.sha256(query.lower().strip().encode("utf-8")).hexdigest()


async def get_hotel_image(name: str, location: str) -> str | None:
    query = f"{name} {location} hotel"
    key = _cache_key(query)
    
    await mongo.connect()
    
    # Check cache
    cached = await mongo.collection("hotel_images").find_one({"cacheKey": key})
    if cached and cached.get("imageUrl"):
        return cached["imageUrl"]
        
    # Fetch from SerpAPI
    image_url = await search_hotel_image(query)
    
    # Save to cache even if None to prevent repeated failed calls? 
    # Better to only cache successes to allow future retries.
    if image_url:
        await mongo.collection("hotel_images").update_one(
            {"cacheKey": key},
            {
                "$set": {
                    "cacheKey": key,
                    "query": query,
                    "imageUrl": image_url,
                    "updatedAt": datetime.now(timezone.utc)
                },
                "$setOnInsert": {
                    "createdAt": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
    return image_url
