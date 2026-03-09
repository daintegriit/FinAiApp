from __future__ import annotations

from typing import Optional, Literal
from datetime import datetime, UTC
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator
import pycountry


# --------------------------------------------------
# ISO Currency Validation
# --------------------------------------------------

def validate_iso_currency(code: str) -> str:

    code = code.upper()

    currency = pycountry.currencies.get(alpha_3=code)

    if currency is None:
        raise ValueError(f"Invalid ISO 4217 currency code: {code}")

    return code


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
# Tax Policy
# --------------------------------------------------

class TaxPolicy(BaseModel):

    effective_tax_rate: Optional[Decimal] = Field(None, ge=0, le=1)

    tax_bracket: Optional[str] = None

    tax_model: Optional[
        Literal[
            "flat",
            "progressive",
            "regional_estimate"
        ]
    ] = None

    fallback_used: Optional[bool] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Macro Policy
# --------------------------------------------------

class MacroPolicy(BaseModel):

    expected_market_return: Optional[Decimal] = Field(None, ge=0)
    expected_inflation: Optional[Decimal] = Field(None, ge=0)

    risk_free_rate: Optional[Decimal] = Field(None, ge=0)

    volatility_band: Optional[
        Literal[
            "low",
            "moderate",
            "high"
        ]
    ] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Income Policy
# --------------------------------------------------

class IncomePolicy(BaseModel):

    income_stability_score: Optional[Decimal] = None

    employment_risk: Optional[
        Literal[
            "low",
            "moderate",
            "high"
        ]
    ] = None

    income_growth_assumption: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Policy Request
# --------------------------------------------------

class PolicyRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    client_timestamp: Optional[datetime] = None

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)

    timezone: Optional[str] = "UTC"

    # Financial inputs used for policy modeling
    income: Optional[Decimal] = Field(None, gt=0)
    assets: Optional[Decimal] = Field(None, ge=0)

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

    # Validators
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        return validate_country(v)


# --------------------------------------------------
# Policy Response
# --------------------------------------------------

class PolicyResponse(BaseModel):

    schema_version: str = "2.0"

    policy_version: str

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Context
    currency: str
    region: Optional[str] = None

    # Policy components
    tax_policy: Optional[TaxPolicy] = None
    macro_policy: Optional[MacroPolicy] = None
    income_policy: Optional[IncomePolicy] = None

    # Policy confidence
    policy_confidence: Optional[
        Literal[
            "low",
            "medium",
            "high"
        ]
    ] = None

    # Data completeness
    data_completeness: Optional[Decimal] = None

    # Currency validation
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}