from __future__ import annotations

from typing import Any

import motor.motor_asyncio

from ..core.config import settings


class Mongo:
    def __init__(self) -> None:
        self.client: motor.motor_asyncio.AsyncIOMotorClient | None = None # type: ignore
        self.db: motor.motor_asyncio.AsyncIOMotorDatabase | None = None # type: ignore

    async def connect(self) -> None:
        if self.client:
            return
        self.client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
        self.db = self.client[settings.MONGODB_DBNAME]

    def collection(self, name: str) -> motor.motor_asyncio.AsyncIOMotorCollection: # type: ignore
        if self.db is None:
            raise RuntimeError("Mongo not connected")
        return self.db[name]

    async def ensure_indexes(self) -> None:
        if self.db is None:
            raise RuntimeError("Mongo not connected")

        # Itineraries caching: unique by cacheKey.
        await self.collection("itineraries").create_index("cacheKey", unique=True, background=True)

        # Chat logs by itinerary.
        await self.collection("chat_logs").create_index([("itineraryId", 1), ("createdAt", -1)])

        # Shared videos
        await self.collection("shared_videos").create_index("createdAt", background=True)

        # OTP codes (internal collection)
        await self.collection("auth_codes").create_index("expiresAt", expireAfterSeconds=0, background=True)
        await self.collection("reset_tokens").create_index("expiresAt", expireAfterSeconds=0, background=True)

        # Hotels: GeoJSON Point within itineraries.hotels.location
        # If your AI returns hotels without location as GeoJSON, this is still safe.
        await self.collection("itineraries").create_index([("hotels.location", "2dsphere")], background=True)


mongo = Mongo()

