from __future__ import annotations

import base64
from datetime import datetime, timezone
from typing import Any
from passlib.context import CryptContext

from ..db.mongo import mongo

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str) -> str:
    if not password:
        return ""
    return pwd_context.hash(password)


def _verify_password(password: str, password_hash: str) -> bool:
    if not password or not password_hash:
        return False
    return pwd_context.verify(password, password_hash)


async def create_user(
    *,
    email: str,
    full_name: str,
    password: str,
    profile_image_base64: str | None = None,
    profile_image_mime_type: str | None = None,
) -> str:
    await mongo.connect()
    email_norm = _normalize_email(email)
    existing = await mongo.collection("users").find_one({"email": email_norm})
    if existing:
        raise ValueError("Email already registered")

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email_norm,
        "fullName": full_name,
        "passwordHash": _hash_password(password),
        "createdAt": now,
        "updatedAt": now,
    }

    if profile_image_base64 is not None:
        user_doc["profileImageBase64"] = profile_image_base64
    if profile_image_mime_type is not None:
        user_doc["profileImageMimeType"] = profile_image_mime_type

    result = await mongo.collection("users").insert_one(user_doc)
    return str(result.inserted_id)


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    await mongo.connect()
    return await mongo.collection("users").find_one({"email": _normalize_email(email)})


async def verify_password(password: str, password_hash: str) -> bool:
    return _verify_password(password, password_hash)


async def update_user_password(*, email: str, password: str) -> None:
    await mongo.connect()
    now = datetime.now(timezone.utc)
    result = await mongo.collection("users").update_one(
        {"email": _normalize_email(email)},
        {"$set": {"passwordHash": _hash_password(password), "updatedAt": now}},
    )
    if result.matched_count == 0:
        raise ValueError("User not found")


async def ensure_user_indexes() -> None:
    await mongo.connect()
    await mongo.collection("users").create_index("email", unique=True, background=True)
