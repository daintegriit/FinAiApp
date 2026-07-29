from __future__ import annotations

from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator
import pycountry


# --------------------------------------------------
# Utility: ISO Currency Validation
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
# Engine Metadata
# --------------------------------------------------

class EngineMeta(BaseModel):
    name: str
    version: str
    processing_ms: Optional[float] = None
    model_config = {"frozen": True}


# --------------------------------------------------
# Explainability
# --------------------------------------------------

class ExplanationItem(BaseModel):
    code: str
    message: str
    severity: Literal["low", "medium", "high"]
    model_config = {"frozen": True}


# --------------------------------------------------
# Financial Health Snapshot
# --------------------------------------------------

class FinancialHealthSnapshot(BaseModel):
    income: Optional[Decimal] = None
    expenses: Optional[Decimal] = None
    savings_rate: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None
    cashflow: Optional[Decimal] = None
    model_config = {"frozen": True}


# --------------------------------------------------
# Request Schema
# --------------------------------------------------

class FinancialAnalysisRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    client_timestamp: Optional[datetime] = None

    # --------------------------------------------------
    # Global context
    # --------------------------------------------------

    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)
    timezone: Optional[str] = "UTC"

    # --------------------------------------------------
    # Core financial inputs
    # --------------------------------------------------

    monthly_income: Optional[Decimal] = Field(None, gt=0)
    monthly_expenses: Optional[Decimal] = Field(None, gt=0)
    total_assets: Optional[Decimal] = Field(None, ge=0)
    total_liabilities: Optional[Decimal] = Field(None, ge=0)
    monthly_investments: Optional[Decimal] = Field(None, ge=0)

    # --------------------------------------------------
    # Commitment parameters (for commitment engine)
    # --------------------------------------------------

    monthly_payment: Optional[Decimal] = Field(None, gt=0)
    term_months: Optional[int] = Field(None, gt=0, le=1200)
    purchase_category: Optional[
        Literal[
            "housing",
            "vehicle",
            "education",
            "business",
            "experience",
            "other",
        ]
    ] = None

    # --------------------------------------------------
    # Demographic context
    # --------------------------------------------------

    age: Optional[int] = Field(None, ge=13, le=120)

    employment_type: Optional[
        Literal[
            "salary",
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

    # --------------------------------------------------
    # Risk & investment profile
    # --------------------------------------------------

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

    # --------------------------------------------------
    # Financial snapshot
    # --------------------------------------------------

    savings_buffer: Optional[Decimal] = Field(None, ge=0)
    existing_debt: Optional[Decimal] = Field(None, ge=0)
    emergency_fund_months: Optional[int] = Field(None, ge=0, le=36)

    # --------------------------------------------------
    # Behavioral profile
    # --------------------------------------------------

    lifestyle_priority: Optional[
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

    financial_goal: Optional[
        Literal[
            "emergency_fund",
            "pay_off_debt",
            "save_for_home",
            "grow_investments",
            "retirement",
        ]
    ] = None

    # --------------------------------------------------
    # Lifestyle utility inputs
    # --------------------------------------------------

    family_value: Optional[float] = Field(None, ge=0, le=10)
    personal_satisfaction: Optional[float] = Field(None, ge=0, le=10)
    commute_improvement: Optional[bool] = None

    # --------------------------------------------------
    # Goal modeling
    # --------------------------------------------------

    goal_cost: Optional[Decimal] = Field(None, gt=0)
    goal_monthly_contribution: Optional[Decimal] = Field(None, gt=0)
    decision_horizon_years: Optional[int] = Field(default=30, ge=1, le=80)

    # --------------------------------------------------
    # Engine toggles
    # --------------------------------------------------

    include_commitment_engine: bool = True
    include_portfolio_engine: bool = True
    include_policy_engine: bool = True
    include_scenario_engine: bool = False

    # --------------------------------------------------
    # Validators
    # --------------------------------------------------

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        return validate_country(v)


# --------------------------------------------------
# Response Schema
# --------------------------------------------------

class FinancialAnalysisResponse(BaseModel):

    schema_version: str = "2.0"

    engine_versions: Optional[List[EngineMeta]] = None

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[float] = None

    currency: str
    region: Optional[str] = None

    financial_health: Optional[FinancialHealthSnapshot] = None

    global_financial_score: Optional[Decimal] = None

    risk_level: Optional[
        Literal["low", "moderate", "high", "critical"]
    ] = None

    engines: Optional[Dict[str, Any]] = None

    explanations: Optional[List[ExplanationItem]] = None

    data_completeness: Optional[Decimal] = None

    # Summary fields for frontend display
    summary: Optional[str] = None
    explanation: Optional[str] = None
    engine_timings: Optional[Dict[str, float]] = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}