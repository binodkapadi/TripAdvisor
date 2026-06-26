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

import base64
import io
from PIL import Image

def compress_base64_image(base64_str: str, max_size: tuple[int, int] = (256, 256), quality: int = 70) -> tuple[str, str]:
    """
    Compresses a base64 image string, resizing it to max_size, and returns the new base64 string and mime type.
    """
    try:
        if "," in base64_str:
            _, encoded = base64_str.split(",", 1)
        else:
            encoded = base64_str
            
        img_data = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_data))
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        img.thumbnail(max_size)
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        
        compressed_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return compressed_b64, "image/jpeg"
    except Exception as e:
        raise ValueError(f"Invalid image data: {str(e)}")
