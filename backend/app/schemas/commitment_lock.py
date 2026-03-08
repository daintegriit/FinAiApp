from __future__ import annotations

from typing import Optional, List, Literal
from datetime import datetime

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
# Assumptions Model
# --------------------------------------------------

class Assumptions(BaseModel):

    annual_return: float
    annual_inflation: float

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

    monthly_payment: float = Field(..., gt=0)
    term_months: int = Field(..., gt=0, le=1200)

    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO 4217 currency code",
    )

    context: Optional[FinancialContext] = None

    net_monthly_income: Optional[float] = Field(None, gt=0)
    current_free_cashflow: Optional[float] = Field(None, gt=0)

    annual_return_assumption: Optional[float] = Field(None, ge=0, le=1)
    annual_inflation_assumption: Optional[float] = Field(None, ge=0, le=1)

    goal_cost: Optional[float] = Field(None, gt=0)
    goal_monthly_contribution: Optional[float] = Field(None, gt=0)

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)


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

    schema_version: str = "1.0"
    engine_version: str

    request_id: Optional[str] = None

    calculation_timestamp: datetime | None = None
    processing_ms: Optional[int] = None

    currency: str

    total_paid: float
    monthly_payment: float
    term_months: int

    annual_return_used: float
    annual_inflation_used: float

    future_value_if_invested: float

    income_share: Optional[float] = None
    free_cashflow_share: Optional[float] = None

    effective_tax_rate_used: Optional[float] = None

    tax_fallback_used: Optional[bool] = None
    tax_confidence: Optional[Literal["low", "medium", "high"]] = None

    policy_versions: Optional[PolicyVersions] = None

    goal_delay_months: Optional[int] = None

    lock_score: int
    lock_score_confidence: Optional[Literal["low", "medium", "high"]] = None

    engine_confidence: Optional[Literal["low", "medium", "high"]] = None

    reasons: List[ReasonCode]

    assumptions_used: Optional[Assumptions] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}