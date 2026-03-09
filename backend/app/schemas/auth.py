from __future__ import annotations

from pydantic import BaseModel, EmailStr
from uuid import UUID


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

    class Config:
        from_attributes = True