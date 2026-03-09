from __future__ import annotations

from typing import Optional, Literal
from datetime import datetime
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
# Financial Metrics
# --------------------------------------------------

class FinancialMetrics(BaseModel):

    net_worth: Optional[Decimal] = None
    monthly_cashflow: Optional[Decimal] = None
    savings_rate: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Financial State Request
# --------------------------------------------------

class FinancialStateRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    client_timestamp: Optional[datetime] = None

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)

    timezone: Optional[str] = "UTC"

    # Core financial inputs
    monthly_income: Optional[Decimal] = Field(None, gt=0)
    monthly_expenses: Optional[Decimal] = Field(None, ge=0)

    total_assets: Optional[Decimal] = Field(None, ge=0)
    total_liabilities: Optional[Decimal] = Field(None, ge=0)

    monthly_investments: Optional[Decimal] = Field(None, ge=0)

    # Demographic context
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
# Financial State Response
# --------------------------------------------------

class FinancialStateResponse(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Context
    currency: str
    region: Optional[str] = None

    # Raw state inputs
    monthly_income: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None

    total_assets: Optional[Decimal] = None
    total_liabilities: Optional[Decimal] = None

    monthly_investments: Optional[Decimal] = None

    # Derived metrics
    metrics: Optional[FinancialMetrics] = None

    # Data completeness
    data_completeness: Optional[Decimal] = None

    # Confidence level
    engine_confidence: Optional[
        Literal["low", "medium", "high"]
    ] = None

    # Currency validation
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}