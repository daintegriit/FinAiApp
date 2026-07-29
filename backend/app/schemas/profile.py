from __future__ import annotations

from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, EmailStr, field_validator
import pycountry


def validate_country(code: str) -> str:
    code = code.upper()
    country = pycountry.countries.get(alpha_2=code)
    if country is None:
        raise ValueError(f"Invalid ISO country code: {code}")
    return code


class ProfileBase(BaseModel):

    user_id: Optional[str] = None
    email: Optional[EmailStr] = None

    country: str = Field(default="US", min_length=2, max_length=2)
    timezone: Optional[str] = Field(default="UTC")

    age: Optional[int] = Field(None, ge=13, le=120)

    employment_type: Optional[
        Literal[
            "full_time",
            "part_time",
            "self_employed",
            "freelance",
            "contract",
            "student",
            "retired",
            "unemployed",
        ]
    ] = None

    monthly_income: Optional[Decimal] = Field(None, ge=0)

    risk_tolerance: Optional[
        Literal[
            "conservative",
            "moderate",
            "aggressive",
        ]
    ] = None

    investment_experience: Optional[
        Literal[
            "beginner",
            "intermediate",
            "advanced",
            "expert",
        ]
    ] = None

    # New financial profile fields
    financial_goal: Optional[
        Literal[
            "emergency_fund",
            "pay_off_debt",
            "save_for_home",
            "grow_investments",
            "retirement",
        ]
    ] = None

    lifestyle: Optional[
        Literal[
            "minimalist",
            "balanced",
            "comfortable",
        ]
    ] = None

    income_stability: Optional[
        Literal[
            "very_stable",
            "stable",
            "variable",
            "unpredictable",
        ]
    ] = None

    savings_amount: Optional[Decimal] = Field(None, ge=0)
    debt_amount: Optional[Decimal] = Field(None, ge=0)
    emergency_fund_months: Optional[int] = Field(None, ge=0, le=36)

    # Location (for peer benchmarking)
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = Field(None, max_length=10)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)

    @field_validator("country")
    @classmethod
    def validate_country_code(cls, v: str) -> str:
        return validate_country(v)


class ProfileCreateRequest(ProfileBase):
    pass


class ProfileUpdateRequest(ProfileBase):
    pass


class ProfileResponse(BaseModel):
    status: str
    processing_ms: float
    profile: Optional[dict] = None

    model_config = {"from_attributes": True}