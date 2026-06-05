from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

from ..core.config import settings
from ..db.mongo import mongo
from ..api.deps import get_current_user
from ..schemas.auth import LoginRequest, SendCodeRequest, VerifyCodeRequest
from ..schemas.ai import ChatRequest, GeneratePlanRequest, GeneratePlanResponse
from ..schemas.places import AutocompleteRequest
from ..schemas.profile import ProfilePhotoRequest
from ..schemas.share import ShareVideoRequest
from ..services.auth_codes import consume_code, generate_code, save_code, verify_code, get_code
from ..services.email_service import send_email, get_verification_email_html, get_password_reset_email_html
from ..services.itinerary_service import generate_plan
from ..services.user_service import (
    create_user,
    get_user_by_email,
    update_user_password,
    verify_password,
)
from ..services.auth_service import jwt_auth, oauth_service
from ..services.chat_service import rag_answer
from ..services.serpapi_client import autocomplete_places
from ..services.video_service import is_valid_social_video_url
from ..services.image_service import get_hotel_image
from ..core.rate_limiter import limiter

router = APIRouter()


def get_base_url() -> str:
    if settings.is_production:
        return "https://tripadvisor-binodkapadi.onrender.com"
    return settings.BASE_URL


def get_frontend_url() -> str:
    if settings.is_production:
        return "https://tripwithbinod.netlify.app"
    return settings.FRONTEND_URL


@router.get("/")
async def root() -> dict[str, str]:
    return {"message": "TripAdvisor API is running properly 🚀"}


def _extract_user_id(claims: dict[str, Any]) -> str:
    return (
        claims.get("uid")
        or claims.get("user_id")
        or claims.get("sub")
        or claims.get("userId")
        or ""
    )


def _extract_user_email(claims: dict[str, Any]) -> str:
    return claims.get("email") or ""


def _validate_password_rules(pw: str) -> None:
    if (
        len(pw) < 8
        or not any(c.isupper() for c in pw)
        or not any(c.islower() for c in pw)
        or not any(c.isdigit() for c in pw)
        or not any(not c.isalnum() for c in pw)
    ):
        raise HTTPException(
            status_code=400,
            detail="Password must be 8+ chars with 1 uppercase, 1 lowercase, 1 number and 1 special char.",
        )


def _validate_email_domain(email: str) -> None:
    allowed_domains = {
        "gmail.com",
        "googlemail.com",
        "microsoft.com",
        "outlook.com",
        "hotmail.com",
        "live.com",
        "msn.com",
        "yahoo.com",
        "yahoo.co.in",
        "yahoo.co.uk",
        "ymail.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "proton.me",
        "protonmail.com",
        "aol.com",
        "zoho.com",
        "zohomail.com",
        "gmx.com",
        "gmx.net",
        "mail.com",
        "yandex.com",
        "yandex.ru",
        "fastmail.com",
        "tutanota.com",
        "tutanota.de",
        "rediffmail.com",
        "mail.ru",
        "qq.com",
        "naver.com",
        "daum.net",
        "kakao.com",
        "cox.net",
        "comcast.net",
        "verizon.net",
        "att.net",
        "btinternet.com",
    }
    parts = email.split("@", 1)
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    domain = parts[1].lower()
    is_edu = domain.endswith(".edu") or ".edu." in domain
    if not is_edu and domain not in allowed_domains:
        raise HTTPException(
            status_code=400,
            detail="Registration is only allowed for trusted email providers or educational domains.",
        )


@router.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/places/autocomplete")
@limiter.limit("30/minute")
async def places_autocomplete(query: str, request: Request, kind: str = "origin") -> JSONResponse:
    try:
        suggestions = await autocomplete_places(query=query, kind=kind)
        return JSONResponse({"suggestions": suggestions})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/images/hotel")
@limiter.limit("50/minute")
async def fetch_hotel_image(name: str, location: str, request: Request) -> dict[str, str | None]:
    try:
        image_url = await get_hotel_image(name, location)
        return {"imageUrl": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/auth/send-code")
@limiter.limit("20/minute")
async def auth_send_code(req: SendCodeRequest, request: Request) -> dict[str, Any]:
    purpose = req.purpose
    if purpose not in ("signup", "forgot_password"):
        raise HTTPException(status_code=400, detail="Invalid purpose")

    _validate_email_domain(req.email)
    code = generate_code()
    # NOTE: store hash only.
    await save_code(email=req.email, purpose=purpose, code=code)

    body_text = f"Your TripAdvisor verification code is: {code}\n\nThis code expires in 10 minutes."
    
    full_name = ""
    if purpose == "signup" and getattr(req, "fullName", None):
        full_name = req.fullName
    elif purpose == "forgot_password":
        user = await get_user_by_email(req.email)
        if user:
            full_name = user.get("fullName", "")
            
    if purpose == "signup":
        subject = "TripAdvisor: Verify your email address"
        body_html = get_verification_email_html(full_name, code)
    else:
        subject = "TripAdvisor: Password Reset"
        body_html = get_password_reset_email_html(full_name, code)

    try:
        await send_email(req.email, subject, body_text, body_html)
        print(f"Email sent successfully to {req.email}")
    except Exception as e:
        # For development: if email fails, still return success but log the code
        print(f"Email failed but continuing: {e}")
        print(f"USE THIS VERIFICATION CODE: {code}")
    
    # Also store in MongoDB for easy debugging
    print(f"Verification code stored in MongoDB: {code} for {req.email} ({purpose})")
    
    return {"ok": True, "purpose": purpose}


@router.get("/api/debug/verification-codes/{email}")
async def debug_get_codes(email: str) -> dict[str, Any]:
    """Debug endpoint to retrieve verification codes from MongoDB"""
    await mongo.connect()
    
    # Get latest codes for both purposes
    signup_code = await get_code(email=email, purpose="signup")
    forgot_code = await get_code(email=email, purpose="forgot_password")
    
    return {
        "email": email,
        "signup_code": signup_code,
        "forgot_password_code": forgot_code,
        "note": "For development only. In production, remove this endpoint."
    }


@router.post("/api/auth/verify-code")
@limiter.limit("20/minute")
async def auth_verify_code(req: VerifyCodeRequest, request: Request) -> dict[str, Any]:
    if req.purpose not in ("signup", "forgot_password"):
        raise HTTPException(status_code=400, detail="Invalid purpose")

    _validate_email_domain(req.email)
    ok = await verify_code(email=req.email, purpose=req.purpose, code=req.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    # Consume so code can't be reused.
    await consume_code(email=req.email, purpose=req.purpose, code=req.code)

    if req.purpose == "signup":
        if not req.fullName or not req.password:
            raise HTTPException(status_code=400, detail="fullName and password are required for signup")
        _validate_password_rules(req.password)

        try:
            user_id = await create_user(email=req.email, full_name=req.fullName, password=req.password)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        access_token = jwt_auth.create_access_token({"sub": user_id, "email": req.email, "fullName": req.fullName})
        return {"accessToken": access_token}

    # forgot password
    if not req.newPassword:
        raise HTTPException(status_code=400, detail="newPassword is required for forgot password")
    _validate_password_rules(req.newPassword)

    try:
        await update_user_password(email=req.email, password=req.newPassword)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}


@router.post("/api/auth/login")
@limiter.limit("20/minute")
async def auth_login(req: LoginRequest, request: Request) -> dict[str, str]:
    _validate_email_domain(req.email)
    user = await get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not await verify_password(req.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = jwt_auth.create_access_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "fullName": user.get("fullName", "")
    })
    print(f"Access token created: {access_token}")
    return {"accessToken": access_token}


@router.get("/api/auth/google")
async def auth_google_login():
    base_url = get_base_url()
    redirect_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={base_url}/api/auth/google/callback"
        f"&scope=openid%20email%20profile&response_type=code"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/api/auth/google/callback")
async def auth_google_callback(code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail={"provider": "google", "error": error})
    if not code:
        raise HTTPException(
            status_code=400,
            detail="Google callback is missing the authorization code. Verify the redirect URI in your Google OAuth settings.",
        )

    base_url = get_base_url()
    user_info = await oauth_service.get_google_user_info(code, f"{base_url}/api/auth/google/callback")
    user = await get_user_by_email(user_info["email"])
    if not user:
        user_id = await create_user(
            email=user_info["email"],
            full_name=user_info.get("name", ""),
            password="",
            profile_image_base64=user_info.get("picture"),
        )
        user = {
            "_id": user_id,
            "email": user_info["email"],
            "fullName": user_info.get("name", ""),
            "profileImageBase64": user_info.get("picture"),
        }
    else:
        # Update user with Google profile info if missing
        await mongo.connect()
        await mongo.collection("users").update_one(
            {"_id": user["_id"]},
            {"$set": {
                "fullName": user.get("fullName") or user_info.get("name", ""),
                "profileImageBase64": user_info.get("picture"),
                "updatedAt": datetime.now(timezone.utc)
            }}
        )

    access_token = jwt_auth.create_access_token({
        "sub": str(user["_id"]), 
        "email": user["email"], 
        "fullName": user.get("fullName") or user_info.get("name", "")
    })
    frontend_url = get_frontend_url()
    return RedirectResponse(f"{frontend_url}/auth/google/callback?accessToken={access_token}")


@router.get("/api/auth/github")
async def auth_github_login():
    base_url = get_base_url()
    redirect_url = (
        f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={base_url}/api/auth/github/callback&scope=user:email"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/api/auth/github/callback")
async def auth_github_callback(code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail={"provider": "github", "error": error})
    if not code:
        raise HTTPException(
            status_code=400,
            detail="GitHub callback is missing the authorization code. Verify the redirect URI in your GitHub OAuth settings.",
        )

    base_url = get_base_url()
    user_info = await oauth_service.get_github_user_info(code, f"{base_url}/api/auth/github/callback")
    email = user_info.get("email") or f"{user_info['id']}@github.local"
    user = await get_user_by_email(email)
    if not user:
        user_id = await create_user(
            email=email,
            full_name=user_info.get("name") or user_info.get("login", ""),
            password="",
            profile_image_base64=user_info.get("avatar_url"),
        )
        user = {
            "_id": user_id,
            "email": email,
            "fullName": user_info.get("name") or user_info.get("login", ""),
            "profileImageBase64": user_info.get("avatar_url"),
        }
    else:
        # Update user with GitHub profile info if missing
        await mongo.connect()
        await mongo.collection("users").update_one(
            {"_id": user["_id"]},
            {"$set": {
                "fullName": user.get("fullName") or user_info.get("name") or user_info.get("login", ""),
                "profileImageBase64": user_info.get("avatar_url"),
                "updatedAt": datetime.now(timezone.utc)
            }}
        )

    access_token = jwt_auth.create_access_token({
        "sub": str(user["_id"]), 
        "email": user["email"], 
        "fullName": user.get("fullName") or user_info.get("name") or user_info.get("login", "")
    })
    frontend_url = get_frontend_url()
    return RedirectResponse(f"{frontend_url}/auth/github/callback?accessToken={access_token}")


@router.get("/api/auth/linkedin")
async def auth_linkedin_login():
    base_url = get_base_url()
    redirect_url = (
        f"https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={settings.LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={base_url}/api/auth/linkedin/callback"
        f"&scope=openid%20profile%20email"
    )
    return RedirectResponse(url=redirect_url)


@router.get("/api/auth/linkedin/callback")
async def auth_linkedin_callback(code: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail={"provider": "linkedin", "error": error})
    if not code:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn callback is missing the authorization code. Verify the redirect URI in your LinkedIn OAuth settings.",
        )

    base_url = get_base_url()
    user_info = await oauth_service.get_linkedin_user_info(code, f"{base_url}/api/auth/linkedin/callback")
    email = user_info.get("email") or f"{user_info.get('sub')}@linkedin.local"
    name = user_info.get("name", "")
    picture = user_info.get("picture", "")
    user = await get_user_by_email(email)
    if not user:
        user_id = await create_user(
            email=email,
            full_name=name,
            password="",
            profile_image_base64=picture,
        )
        user = {
            "_id": user_id,
            "email": email,
            "fullName": name,
            "profileImageBase64": picture,
        }
    else:
        # Update user with LinkedIn profile info if missing
        await mongo.connect()
        await mongo.collection("users").update_one(
            {"_id": user["_id"]},
            {"$set": {
                "fullName": user.get("fullName") or name,
                "profileImageBase64": picture,
                "updatedAt": datetime.now(timezone.utc)
            }}
        )

    access_token = jwt_auth.create_access_token({
        "sub": str(user["_id"]), 
        "email": user["email"], 
        "fullName": user.get("fullName") or name
    })
    frontend_url = get_frontend_url()
    return RedirectResponse(f"{frontend_url}/auth/linkedin/callback?accessToken={access_token}")


@router.get("/api/user/trips/latest")
@limiter.limit("20/minute")
async def get_latest_trip(
    request: Request,
    claims: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = _extract_user_id(claims)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await mongo.connect()
    
    latest_trip = await mongo.collection("trips").find_one(
        {"userId": user_id}, sort=[("createdAt", -1)]
    )
    
    if not latest_trip:
        return {} # No trips found for user
        
    itinerary_id = latest_trip.get("itineraryId")
    if not itinerary_id:
        return {}
        
    itinerary_doc = await mongo.collection("itineraries").find_one({"itineraryId": itinerary_id})
    if not itinerary_doc or not itinerary_doc.get("data"):
        return {}
        
    # Return the exact schema TripProvider expects
    return {
        "itineraryId": itinerary_id,
        "itinerary": itinerary_doc["data"].get("optimizedItinerary", {})
    }


@router.get("/api/user/profile")
@limiter.limit("30/minute")
async def get_user_profile(
    request: Request,
    claims: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = _extract_user_id(claims)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await mongo.connect()
    
    # Convert string _id to ObjectId for MongoDB lookup
    try:
        from bson import ObjectId
        user = await mongo.collection("users").find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        # If ObjectId conversion fails, try as string (fallback for edge cases)
        user = await mongo.collection("users").find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile_image_value = user.get("profileImageBase64")
    profile_image_mime = user.get("profileImageMimeType")
    if profile_image_value and profile_image_mime and not profile_image_value.startswith("data:"):
        profile_image_value = f"data:{profile_image_mime};base64,{profile_image_value}"
    
    return {
        "email": user.get("email"),
        "fullName": user.get("fullName"),
        "profileImageBase64": profile_image_value,
        "profileImageMimeType": profile_image_mime,
    }


@router.post("/api/user/profile/photo")
@limiter.limit("10/minute")
async def upload_profile_photo(
    payload: ProfilePhotoRequest,
    request: Request,
    claims: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = _extract_user_id(claims)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await mongo.connect()
    
    # Convert string _id to ObjectId for MongoDB lookup
    try:
        from bson import ObjectId
        user = await mongo.collection("users").find_one({"_id": ObjectId(user_id)})
        actual_user_id = ObjectId(user_id)
    except Exception as e:
        # If ObjectId conversion fails, try as string (fallback for edge cases)
        user = await mongo.collection("users").find_one({"_id": user_id})
        actual_user_id = user_id
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user profile image
    await mongo.collection("users").update_one(
        {"_id": actual_user_id},
        {
            "$set": {
                "profileImageBase64": payload.imageBase64,
                "profileImageMimeType": payload.mimeType,
                "updatedAt": datetime.now(timezone.utc)
            }
        }
    )

    return {"ok": True}


@router.post("/api/ai/generate-plan", response_model=GeneratePlanResponse)
@limiter.limit("10/minute")
async def ai_generate_plan(
    req: GeneratePlanRequest,
    request: Request,
) -> Any:
    # Use actual user ID if authenticated, else anonymous
    user_id = "anonymous_user"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            claims = await get_current_user(authorization=auth_header)
            extracted_id = _extract_user_id(claims)
            if extracted_id:
                user_id = extracted_id
        except Exception:
            pass

    user_email = req.email or "anonymous@example.com"
    if not user_email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Trust frontend fullName/email for the itinerary email greeting.
    # Backend uses user ID for caching and storage.
    form = {
        "origin": req.origin,
        "destination": req.destination,
        "startDate": req.startDate,
        "endDate": req.endDate,
        "budget": req.budget,
        "transportMode": req.transportMode,
        "travelType": req.travelType,
        "numberOfPeople": req.numberOfPeople,
        "preferences": req.preferences,
    }

    full_name = req.fullName
    email = req.email or user_email
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    data = await generate_plan(user_id=user_id, email=email, full_name=full_name, form=form)
    return data


@router.post("/api/ai/chat", response_model=dict)
@limiter.limit("10/minute")
async def ai_chat(
    req: ChatRequest,
    request: Request,
) -> Any:
    # Use actual user ID if authenticated, else anonymous
    user_id = "anonymous_user"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            claims = await get_current_user(authorization=auth_header)
            extracted_id = _extract_user_id(claims)
            if extracted_id:
                user_id = extracted_id
        except Exception:
            pass

    print(f"Chat request received: user_id={user_id}, itinerary_id={req.itineraryId}, question={req.question}")
    
    try:
        answer = await rag_answer(
            user_id=user_id,
            itinerary_id=req.itineraryId,
            question=req.question,
            history=[h.model_dump() for h in req.history] if req.history else None
        )
        print(f"Chat response generated: {answer[:100]}...")
        return {"answer": answer}
    except Exception as e:
        print(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process chat request")


@router.get("/api/ai/chat/history")
@limiter.limit("20/minute")
async def get_chat_history(
    request: Request,
    itineraryId: str,
    claims: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    user_id = _extract_user_id(claims)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await mongo.connect()
    
    # Fetch chat logs for the specific user and itinerary
    cursor = mongo.collection("chat_logs").find(
        {"userId": user_id, "itineraryId": itineraryId}
    ).sort("createdAt", 1)  # Sort ascending
    
    logs = await cursor.to_list(length=100)
    
    messages = []
    for log in logs:
        if "question" in log and "answer" in log:
            messages.append({"type": "user", "content": log["question"]})
            messages.append({"type": "assistant", "content": log["answer"]})
            
    return messages


@router.post("/api/share-video")
@limiter.limit("10/minute")
async def share_video(payload: ShareVideoRequest, request: Request) -> dict[str, Any]:
    url = payload.videoUrl.strip()
    if not is_valid_social_video_url(url):
        raise HTTPException(status_code=400, detail="Invalid or unsupported social media URL")

    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Best-effort: store user if token is valid, but don't hard-fail sharing.
        try:
            claims = await get_current_user(authorization=auth_header)
            user_id = _extract_user_id(claims)
        except Exception:
            user_id = None

    await mongo.connect()
    await mongo.collection("shared_videos").insert_one(
        {
            "userId": user_id,
            "videoUrl": url,
            "createdAt": datetime.now(timezone.utc),
        }
    )

    # Notify admin email.
    subject = "TripAdvisor: shared trip link"
    await send_email(
        settings.NOTIFY_EMAIL,
        subject,
        f"A user shared a trip link:\n\n{url}\n\n(Stored in shared_videos collection.)",
    )

    return {"ok": True}


@router.post("/api/user/profile/photo")
@limiter.limit("10/minute")
async def upload_profile_photo(
    payload: ProfilePhotoRequest,
    request: Request,
    claims: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    user_id = _extract_user_id(claims)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")

    await mongo.connect()
    
    # Convert string _id to ObjectId for MongoDB lookup
    try:
        from bson import ObjectId
        user = await mongo.collection("users").find_one({"_id": ObjectId(user_id)})
        actual_user_id = ObjectId(user_id)
    except Exception as e:
        # If ObjectId conversion fails, try as string (fallback for edge cases)
        user = await mongo.collection("users").find_one({"_id": user_id})
        actual_user_id = user_id
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await mongo.collection("users").update_one(
        {"_id": actual_user_id},
        {
            "$set": {
                "profileImageBase64": payload.imageBase64,
                "profileImageMimeType": payload.mimeType,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
    )

    return {"ok": True}

