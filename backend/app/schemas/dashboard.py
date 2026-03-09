from __future__ import annotations

from typing import Optional, Dict, Any, List
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
# Dashboard Engine Results
# --------------------------------------------------

class CommitmentSummary(BaseModel):

    lock_score: Optional[int] = None
    opportunity_cost: Optional[Decimal] = None
    monthly_payment: Optional[Decimal] = None
    total_commitment: Optional[Decimal] = None


class PortfolioSummary(BaseModel):

    projected_value: Optional[Decimal] = None
    total_contributions: Optional[Decimal] = None
    expected_return: Optional[Decimal] = None
    volatility: Optional[Decimal] = None


class FinancialHealth(BaseModel):

    savings_rate: Optional[Decimal] = None
    cashflow: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None
    global_financial_score: Optional[Decimal] = None


# --------------------------------------------------
# Request Schema
# --------------------------------------------------

class DashboardRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    client_timestamp: Optional[datetime] = None

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)

    timezone: Optional[str] = Field(default="UTC")

    # Engine toggles
    include_commitment_engine: bool = True
    include_portfolio_engine: bool = True
    include_policy_engine: bool = True
    include_scenario_engine: bool = False

    # Optional user context
    user_id: Optional[str] = None

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

class DashboardResponse(BaseModel):

    schema_version: str = "2.0"

    engine_versions: Optional[List[EngineMeta]] = None

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Global context
    currency: str
    region: Optional[str] = None

    # Aggregated financial intelligence
    commitment_summary: Optional[CommitmentSummary] = None
    portfolio_summary: Optional[PortfolioSummary] = None
    financial_health: Optional[FinancialHealth] = None

    # Optional raw engine outputs
    engines: Optional[Dict[str, Any]] = None

    # Data integrity metrics
    data_completeness: Optional[Decimal] = None

    # Currency validator
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}