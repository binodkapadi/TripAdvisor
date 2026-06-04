from __future__ import annotations

from typing import Any

from fastapi import Depends, Header, HTTPException, status

from ..services.auth_service import jwt_auth


async def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt_auth.verify_token(token)
        return payload
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

