from __future__ import annotations

from typing import Optional, List, Literal, Dict, Any
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
# Engine Metadata
# --------------------------------------------------

class EngineMeta(BaseModel):

    name: str
    version: str
    processing_ms: Optional[int] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Report Explanation
# --------------------------------------------------

class ReportInsight(BaseModel):

    title: str
    description: str

    severity: Literal[
        "info",
        "warning",
        "risk",
        "opportunity"
    ]

    model_config = {"frozen": True}


# --------------------------------------------------
# Financial Projection Summary
# --------------------------------------------------

class ProjectionSummary(BaseModel):

    projected_portfolio_value: Optional[Decimal] = None
    total_contributions: Optional[Decimal] = None
    investment_growth: Optional[Decimal] = None

    inflation_adjusted_value: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Financial Health Summary
# --------------------------------------------------

class FinancialHealthSummary(BaseModel):

    net_worth: Optional[Decimal] = None
    savings_rate: Optional[Decimal] = None
    debt_ratio: Optional[Decimal] = None
    monthly_cashflow: Optional[Decimal] = None

    financial_score: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Report Request
# --------------------------------------------------

class ReportRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    client_timestamp: Optional[datetime] = None

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)

    timezone: Optional[str] = "UTC"

    # Engines to include
    include_portfolio: bool = True
    include_commitment: bool = True
    include_financial_health: bool = True
    include_policy: bool = True
    include_scenarios: bool = False

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
# Report Response
# --------------------------------------------------

class ReportResponse(BaseModel):

    schema_version: str = "2.0"

    report_id: Optional[str] = None

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Context
    currency: str
    region: Optional[str] = None

    # Engine versions used
    engine_versions: Optional[List[EngineMeta]] = None

    # Financial summaries
    projection: Optional[ProjectionSummary] = None
    financial_health: Optional[FinancialHealthSummary] = None

    # Insights and recommendations
    insights: Optional[List[ReportInsight]] = None

    # Raw engine outputs (optional)
    engines: Optional[Dict[str, Any]] = None

    # Data completeness metric
    data_completeness: Optional[Decimal] = None

    # Currency validator
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}