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
    processing_ms: Optional[int] = None

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

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)
    timezone: Optional[str] = "UTC"

    # Core financial inputs
    monthly_income: Optional[Decimal] = Field(None, gt=0)
    monthly_expenses: Optional[Decimal] = Field(None, gt=0)

    total_assets: Optional[Decimal] = Field(None, ge=0)
    total_liabilities: Optional[Decimal] = Field(None, ge=0)

    monthly_investments: Optional[Decimal] = Field(None, ge=0)

    # Engine toggles
    include_commitment_engine: bool = True
    include_portfolio_engine: bool = True
    include_policy_engine: bool = True
    include_scenario_engine: bool = False

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
# Response Schema
# --------------------------------------------------

class FinancialAnalysisResponse(BaseModel):

    schema_version: str = "2.0"

    engine_versions: Optional[List[EngineMeta]] = None

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Context
    currency: str
    region: Optional[str] = None

    # Financial snapshot
    financial_health: Optional[FinancialHealthSnapshot] = None

    # Overall financial intelligence score
    global_financial_score: Optional[Decimal] = None

    risk_level: Optional[
        Literal["low", "moderate", "high", "critical"]
    ] = None

    # Engine outputs
    engines: Optional[Dict[str, Any]] = None

    # Explainability
    explanations: Optional[List[ExplanationItem]] = None

    # Data integrity
    data_completeness: Optional[Decimal] = None

    # Currency validator
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}