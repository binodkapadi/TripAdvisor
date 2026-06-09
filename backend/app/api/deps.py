from __future__ import annotations

from typing import Any

from fastapi import Depends, Request, HTTPException, status

from ..services.auth_service import jwt_auth


async def get_current_user(request: Request) -> dict[str, Any]:
    token = request.cookies.get("accessToken")
    
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")

    try:
        payload = jwt_auth.verify_token(token)
        return payload
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

