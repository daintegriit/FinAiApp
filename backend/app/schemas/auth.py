from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional
from datetime import datetime


# --------------------------------------------------
# Register Request
# --------------------------------------------------

class RegisterRequest(BaseModel):

    email: EmailStr
    username: str
    password: str


# --------------------------------------------------
# Login Request
# --------------------------------------------------

class LoginRequest(BaseModel):

    email: EmailStr
    password: str


# --------------------------------------------------
# Token Response
# --------------------------------------------------

class TokenResponse(BaseModel):

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# --------------------------------------------------
# User Response
# --------------------------------------------------


class UserResponse(BaseModel):

    id: UUID
    email: EmailStr
    username: str
    is_active: bool
    is_admin: bool
    terms_accepted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --------------------------------------------------
# Google Auth Request
# --------------------------------------------------

class GoogleAuthRequest(BaseModel):

    id_token: str


# --------------------------------------------------
# Apple Auth Request
# --------------------------------------------------

class AppleAuthRequest(BaseModel):

    identity_token: str
    full_name: Optional[str] = None
    email: Optional[str] = None