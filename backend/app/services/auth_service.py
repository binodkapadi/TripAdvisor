from __future__ import annotations

import jwt
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from ..core.config import settings


class JWTAuth:
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24 * 7  # 7 days

    def create_access_token(self, data: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.JWTError:
            raise ValueError("Invalid token")


class OAuthService:
    def __init__(self):
        self.google_client_id = settings.GOOGLE_CLIENT_ID
        self.github_client_id = settings.GITHUB_CLIENT_ID
        self.linkedin_client_id = settings.LINKEDIN_CLIENT_ID
        self.base_url = settings.BASE_URL

    async def get_google_user_info(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        import httpx
        
        # Exchange code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": self.google_client_id,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info
            user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {token_data['access_token']}"}
            
            user_response = await client.get(user_info_url, headers=headers)
            user_response.raise_for_status()
            
            return user_response.json()

    async def get_github_user_info(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        import httpx
        
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "code": code,
            "client_id": self.github_client_id,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "redirect_uri": redirect_uri
        }
        
        headers = {"Accept": "application/json"}
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data, headers=headers)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info
            user_info_url = "https://api.github.com/user"
            headers = {
                "Authorization": f"Bearer {token_data['access_token']}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            user_response = await client.get(user_info_url, headers=headers)
            user_response.raise_for_status()
            
            user_data = user_response.json()
            
            # Get user email (GitHub requires separate API call for email)
            email_response = await client.get("https://api.github.com/user/emails", headers=headers)
            email_response.raise_for_status()
            emails = email_response.json()
            primary_email = next((email["email"] for email in emails if email["primary"]), None)
            
            user_data["email"] = primary_email
            
            return user_data

    async def get_linkedin_user_info(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        import httpx
        
        # Exchange code for access token
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        token_data = {
            "code": code,
            "client_id": self.linkedin_client_id,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info
            user_info_url = "https://api.linkedin.com/v2/people"
            headers = {
                "Authorization": f"Bearer {token_data['access_token']}"
            }
            
            params = {
                "fields": "id,firstName,lastName,profilePicture(displayImage~:playableStreams)"
            }
            
            user_response = await client.get(user_info_url, headers=headers, params=params)
            user_response.raise_for_status()
            
            user_data = user_response.json()
            
            # Get email
            email_url = "https://api.linkedin.com/v2/emailAddress"
            email_params = {
                "q": "members",
                "fields": "emailAddress"
            }
            
            email_response = await client.get(email_url, headers=headers, params=email_params)
            email_response.raise_for_status()
            
            email_data = email_response.json()
            if email_data.get("elements"):
                user_data["email"] = email_data["elements"][0]["emailAddress"]
            
            return user_data


# Create instances
jwt_auth = JWTAuth()
oauth_service = OAuthService()
