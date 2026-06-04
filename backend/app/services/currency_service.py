from datetime import datetime, timezone, timedelta
import httpx
from ..db.mongo import mongo

async def get_exchange_rates(base: str = "USD") -> dict:
    """
    Fetches real-time exchange rates for the given base currency.
    Caches the result in MongoDB for offline availability and fast retrieval.
    Also logs daily historical rates.
    """
    await mongo.connect()
    
    # 1. Check cache (valid for 12 hours)
    cache = await mongo.collection("currency_cache").find_one({"base": base})
    if cache and cache.get("timestamp"):
        # Make timestamp offset-aware if it isn't already (older PyMongo might return naive datetimes)
        cache_time = cache["timestamp"]
        if cache_time.tzinfo is None:
            cache_time = cache_time.replace(tzinfo=timezone.utc)
            
        if datetime.now(timezone.utc) - cache_time < timedelta(hours=12):
            return cache.get("rates", {})
            
    # 2. Fetch from real-time API (open.er-api.com)
    url = f"https://open.er-api.com/v6/latest/{base}"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            rates = data.get("rates", {})
            
            if not rates:
                raise ValueError("No rates found in API response")
                
            now_utc = datetime.now(timezone.utc)
            
            # 3. Cache the new rates
            await mongo.collection("currency_cache").update_one(
                {"base": base},
                {
                    "$set": {
                        "rates": rates,
                        "timestamp": now_utc
                    }
                },
                upsert=True
            )
            
            # 4. Save to historical tracking (one record per day per base)
            date_str = now_utc.strftime("%Y-%m-%d")
            await mongo.collection("currency_history").update_one(
                {"base": base, "date": date_str},
                {
                    "$set": {
                        "rates": rates,
                        "timestamp": now_utc
                    }
                },
                upsert=True
            )
            
            return rates
            
    except Exception as e:
        print(f"Failed to fetch live currency rates: {e}")
        # Fallback to offline cached rates if available, even if expired
        if cache:
            print("Using expired cached rates as fallback")
            return cache.get("rates", {})
        return {}
