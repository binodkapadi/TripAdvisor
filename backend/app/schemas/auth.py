from typing import Literal

from pydantic import BaseModel, EmailStr, Field


Purpose = Literal['signup', 'forgot_password']


class SendCodeRequest(BaseModel):
    purpose: Purpose
    email: EmailStr
    fullName: str | None = None


class VerifyCodeRequest(BaseModel):
    purpose: Purpose
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)

    # Signup
    fullName: str | None = None
    password: str | None = None

    # Forgot password
    newPassword: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

