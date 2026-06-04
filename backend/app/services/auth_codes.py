from __future__ import annotations

import hashlib
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Any

from ..db.mongo import mongo


def generate_code() -> str:
    """Generate a 6-digit verification code."""
    return "".join(random.choices(string.digits, k=6))


def _hash_code(code: str) -> str:
    """Hash a verification code for secure storage."""
    return hashlib.sha256(code.encode()).hexdigest()


def _get_collection_name(purpose: str) -> str:
    return "auth_codes" if purpose == "signup" else "reset_tokens"


async def save_code(email: str, purpose: str, code: str) -> None:
    """Save a verification code to MongoDB."""
    await mongo.connect()
    
    # Store the hash, not the plain code
    code_hash = _hash_code(code)
    collection = _get_collection_name(purpose)
    
    await mongo.collection(collection).update_one(
        {"email": email, "purpose": purpose},
        {
            "$set": {
                "codeHash": code_hash,
                "createdAt": datetime.now(timezone.utc),
                "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=10)
            }
        },
        upsert=True,
    )


async def verify_code(email: str, purpose: str, code: str) -> bool:
    """Verify a code against the stored hash."""
    await mongo.connect()
    
    code_hash = _hash_code(code)
    collection = _get_collection_name(purpose)
    
    stored = await mongo.collection(collection).find_one({
        "email": email,
        "purpose": purpose,
        "codeHash": code_hash
    })
    
    if not stored:
        return False
    
    # Check if code has expired
    expires_at = stored.get("expiresAt")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return False
    
    return True


async def consume_code(email: str, purpose: str, code: str) -> bool:
    """Verify and consume a code (delete it after successful verification)."""
    if await verify_code(email, purpose, code):
        await mongo.connect()
        collection = _get_collection_name(purpose)
        await mongo.collection(collection).delete_one({
            "email": email,
            "purpose": purpose
        })
        return True
    return False


async def get_code(email: str, purpose: str) -> dict[str, Any] | None:
    """Get stored code information (for debugging)."""
    await mongo.connect()
    collection = _get_collection_name(purpose)
    return await mongo.collection(collection).find_one({
        "email": email,
        "purpose": purpose
    })
