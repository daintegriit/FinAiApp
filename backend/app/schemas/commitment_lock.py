from __future__ import annotations

from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator
import pycountry

from app.policy.context import FinancialContext


# --------------------------------------------------
# Utility: ISO 4217 Currency Validation
# --------------------------------------------------

def validate_iso_currency(code: str) -> str:

    code = code.upper()

    currency = pycountry.currencies.get(alpha_3=code)

    if currency is None:
        raise ValueError(f"Invalid ISO 4217 currency code: {code}")

    return code


# --------------------------------------------------
# Utility: ISO Country Validation
# --------------------------------------------------

def validate_country(code: str) -> str:

    code = code.upper()

    country = pycountry.countries.get(alpha_2=code)

    if country is None:
        raise ValueError(f"Invalid ISO country code: {code}")

    return code


# --------------------------------------------------
# Assumptions Model
# --------------------------------------------------

class Assumptions(BaseModel):

    annual_return: Decimal = Field(..., ge=0)
    annual_inflation: Decimal = Field(..., ge=0)

    source: Literal["user", "default", "regional"]

    model_config = {"frozen": True}


# --------------------------------------------------
# Policy Version Model
# --------------------------------------------------

class PolicyVersions(BaseModel):

    tax_policy: Optional[str] = None
    macro_policy: Optional[str] = None
    income_policy: Optional[str] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Request Schema
# --------------------------------------------------

class CommitmentLockRequest(BaseModel):

    # -----------------------------
    # Request Metadata
    # -----------------------------

    schema_version: str = "2.0"

    request_id: Optional[str] = Field(
        default=None,
        description="Unique request identifier for tracing"
    )

    trace_id: Optional[str] = Field(
        default=None,
        description="Distributed tracing ID"
    )

    client_timestamp: Optional[datetime] = None

    # -----------------------------
    # Core commitment parameters
    # -----------------------------

    monthly_payment: Decimal = Field(..., gt=0)
    term_months: int = Field(..., gt=0, le=1200)

    # -----------------------------
    # Currency context
    # -----------------------------

    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO 4217 currency code"
    )

    # -----------------------------
    # Global economic context
    # -----------------------------

    region: str = Field(
        default="US",
        min_length=2,
        max_length=2,
        description="ISO country code used for macro assumptions"
    )

    timezone: Optional[str] = Field(
        default="UTC",
        description="User timezone for financial calculations"
    )

    context: Optional[FinancialContext] = None

    # -----------------------------
    # Income context
    # -----------------------------

    net_monthly_income: Optional[Decimal] = Field(None, gt=0)
    current_free_cashflow: Optional[Decimal] = Field(None, gt=0)

    # -----------------------------
    # Economic assumptions
    # -----------------------------

    annual_return_assumption: Optional[Decimal] = Field(None, ge=0, le=1)
    annual_inflation_assumption: Optional[Decimal] = Field(None, ge=0, le=1)

    # -----------------------------
    # Decision context
    # -----------------------------

    purchase_category: Optional[
        Literal[
            "housing",
            "vehicle",
            "education",
            "business",
            "experience",
            "other"
        ]
    ] = None

    decision_horizon_years: Optional[int] = Field(
        default=30,
        ge=1,
        le=80
    )

    # -----------------------------
    # Goal modeling
    # -----------------------------

    goal_cost: Optional[Decimal] = Field(None, gt=0)
    goal_monthly_contribution: Optional[Decimal] = Field(None, gt=0)

    # -----------------------------
    # Demographic context
    # -----------------------------

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

    # -----------------------------
    # Client metadata
    # -----------------------------

    client_version: Optional[str] = None

    request_origin: Optional[
        Literal["web", "mobile", "api", "partner"]
    ] = None

    # -----------------------------
    # Validators
    # -----------------------------

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        return validate_country(v)


# --------------------------------------------------
# Explainability
# --------------------------------------------------

class ReasonCode(BaseModel):

    code: str
    severity: Literal["low", "medium", "high"]
    message: str

    model_config = {"frozen": True}


# --------------------------------------------------
# Response Schema
# --------------------------------------------------

class CommitmentLockResponse(BaseModel):

    schema_version: str = "2.0"
    engine_version: str

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    calculation_timestamp: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # -----------------------------
    # Context
    # -----------------------------

    currency: str
    region: Optional[str] = None

    # -----------------------------
    # Commitment information
    # -----------------------------

    total_paid: Decimal
    monthly_payment: Decimal
    term_months: int

    # -----------------------------
    # Economic assumptions used
    # -----------------------------

    annual_return_used: Decimal
    annual_inflation_used: Decimal

    # -----------------------------
    # Opportunity cost modeling
    # -----------------------------

    future_value_if_invested: Decimal

    # -----------------------------
    # Income ratios
    # -----------------------------

    income_share: Optional[Decimal] = None
    free_cashflow_share: Optional[Decimal] = None

    # -----------------------------
    # Tax modeling
    # -----------------------------

    effective_tax_rate_used: Optional[Decimal] = None
    tax_fallback_used: Optional[bool] = None

    tax_confidence: Optional[
        Literal["low", "medium", "high"]
    ] = None

    # -----------------------------
    # Policy tracking
    # -----------------------------

    policy_versions: Optional[PolicyVersions] = None

    # -----------------------------
    # Goal delay impact
    # -----------------------------

    goal_delay_months: Optional[int] = None

    # -----------------------------
    # Lock scoring
    # -----------------------------

    lock_score: int

    lock_score_confidence: Optional[
        Literal["low", "medium", "high"]
    ] = None

    # -----------------------------
    # Engine confidence
    # -----------------------------

    engine_confidence: Optional[
        Literal["low", "medium", "high"]
    ] = None

    # -----------------------------
    # Explainability
    # -----------------------------

    reasons: List[ReasonCode]

    # -----------------------------
    # Assumptions metadata
    # -----------------------------

    assumptions_used: Optional[Assumptions] = None

    # -----------------------------
    # Data completeness
    # -----------------------------

    data_completeness: Optional[Decimal] = None

    # -----------------------------
    # Currency validation
    # -----------------------------

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}