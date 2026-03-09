from __future__ import annotations

from typing import Optional, Literal
from datetime import datetime

from pydantic import BaseModel, Field, EmailStr


# --------------------------------------------------
# User Role
# --------------------------------------------------

UserRole = Literal[
    "user",
    "advisor",
    "admin"
]


# --------------------------------------------------
# Account Status
# --------------------------------------------------

AccountStatus = Literal[
    "active",
    "pending",
    "suspended",
    "deleted"
]


# --------------------------------------------------
# User Create Request
# --------------------------------------------------

class UserCreateRequest(BaseModel):

    email: EmailStr = Field(
        description="User email address"
    )

    password: str = Field(
        min_length=8,
        description="User password"
    )

    role: UserRole = "user"

# --------------------------------------------------
# User Update Request
# --------------------------------------------------

class UserUpdateRequest(BaseModel):

    email: Optional[EmailStr] = None

    password: Optional[str] = Field(
        default=None,
        min_length=8
    )

    role: Optional[UserRole] = None

    status: Optional[AccountStatus] = None


# --------------------------------------------------
# User Login Request
# --------------------------------------------------

class UserLoginRequest(BaseModel):

    email: EmailStr
    password: str


# --------------------------------------------------
# User Response
# --------------------------------------------------

class UserResponse(BaseModel):

    user_id: str

    email: EmailStr

    role: UserRole

    status: AccountStatus = "active"

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    last_login: Optional[datetime] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# User Public Profile
# --------------------------------------------------

class UserPublic(BaseModel):

    user_id: str
    role: UserRole

    model_config = {"frozen": True}