from __future__ import annotations

from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, EmailStr, field_validator
import pycountry


# --------------------------------------------------
# ISO Country Validation
# --------------------------------------------------

def validate_country(code: str) -> str:

    code = code.upper()

    country = pycountry.countries.get(alpha_2=code)

    if country is None:
        raise ValueError(f"Invalid ISO country code: {code}")

    return code


# --------------------------------------------------
# Base Profile Schema
# --------------------------------------------------

class ProfileBase(BaseModel):

    # Identity
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None

    # Location context
    country: str = Field(default="US", min_length=2, max_length=2)
    timezone: Optional[str] = Field(default="UTC")

    # Demographics
    age: Optional[int] = Field(None, ge=18, le=100)

    employment_type: Optional[
        Literal[
            "salary",
            "self_employed",
            "contract",
            "student",
            "retired"
        ]
    ] = None

    # Financial context
    monthly_income: Optional[Decimal] = Field(None, gt=0)

    risk_tolerance: Optional[
        Literal[
            "conservative",
            "moderate",
            "aggressive"
        ]
    ] = None

    investment_experience: Optional[
        Literal[
            "beginner",
            "intermediate",
            "advanced"
        ]
    ] = None

    # Validators
    @field_validator("country")
    @classmethod
    def validate_country_code(cls, v: str) -> str:
        return validate_country(v)


# --------------------------------------------------
# Profile Create
# --------------------------------------------------

class ProfileCreateRequest(ProfileBase):
    pass


# --------------------------------------------------
# Profile Update
# --------------------------------------------------

class ProfileUpdateRequest(ProfileBase):
    pass


# --------------------------------------------------
# Profile Response
# --------------------------------------------------

class ProfileResponse(ProfileBase):

    schema_version: str = "2.0"

    profile_id: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    profile_completeness: Optional[Decimal] = None

    model_config = {"frozen": True}