from __future__ import annotations

from typing import Optional, List, Literal
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
# Request Schema
# --------------------------------------------------

class CommitmentLockRequest(BaseModel):
    """
    Global Production-Grade Commitment Lock Request
    """

    monthly_payment: float = Field(..., gt=0)
    term_months: int = Field(..., gt=0, le=1200)

    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO 4217 currency code",
    )

    # 🌍 Global financial context
    context: Optional[FinancialContext] = None

    # Backwards compatibility
    net_monthly_income: Optional[float] = Field(None, gt=0)
    current_free_cashflow: Optional[float] = Field(None, gt=0)

    # Financial modeling assumptions
    annual_return_assumption: Optional[float] = Field(None, ge=0, le=1)
    annual_inflation_assumption: Optional[float] = Field(None, ge=0, le=1)

    # Goal modeling
    goal_cost: Optional[float] = Field(None, gt=0)
    goal_monthly_contribution: Optional[float] = Field(None, gt=0)

    # --------------------------
    # Validators
    # --------------------------

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)


# --------------------------------------------------
# Explainability Schema
# --------------------------------------------------

class ReasonCode(BaseModel):
    code: str
    severity: Literal["low", "medium", "high"]
    message: str


# --------------------------------------------------
# Response Schema
# --------------------------------------------------

class CommitmentLockResponse(BaseModel):
    """
    Global Production-Grade Commitment Lock Response
    """

    currency: str

    total_paid: float
    monthly_payment: float
    term_months: int

    annual_return_used: float
    annual_inflation_used: float
    future_value_if_invested: float

    income_share: Optional[float] = None
    free_cashflow_share: Optional[float] = None

    # 🌍 Policy transparency
    effective_tax_rate_used: Optional[float] = None

    goal_delay_months: Optional[int] = None

    lock_score: int
    reasons: List[ReasonCode]

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)
