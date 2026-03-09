from __future__ import annotations

from typing import Optional, List, Literal
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
# Portfolio Asset Allocation
# --------------------------------------------------

class AssetAllocation(BaseModel):

    asset_class: Literal[
        "equities",
        "bonds",
        "real_estate",
        "commodities",
        "crypto",
        "cash",
        "other"
    ]

    allocation_percent: Decimal = Field(..., ge=0, le=1)

    expected_return: Optional[Decimal] = Field(None, ge=0)
    volatility: Optional[Decimal] = Field(None, ge=0)

    model_config = {"frozen": True}


# --------------------------------------------------
# Portfolio Assumptions
# --------------------------------------------------

class PortfolioAssumptions(BaseModel):

    annual_return: Decimal = Field(..., ge=0)
    volatility: Optional[Decimal] = Field(None, ge=0)
    annual_inflation: Optional[Decimal] = Field(None, ge=0)

    source: Literal[
        "user",
        "policy_engine",
        "market_estimate"
    ]

    model_config = {"frozen": True}


# --------------------------------------------------
# Monte Carlo Summary
# --------------------------------------------------

class MonteCarloSummary(BaseModel):

    simulations: int

    median_outcome: Decimal
    p10_outcome: Decimal
    p90_outcome: Decimal

    probability_of_loss: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Request Schema
# --------------------------------------------------

class PortfolioRequest(BaseModel):

    schema_version: str = "2.0"

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    client_timestamp: Optional[datetime] = None

    # Global context
    currency: str = Field(default="USD", min_length=3, max_length=3)
    region: str = Field(default="US", min_length=2, max_length=2)

    timezone: Optional[str] = "UTC"

    # Portfolio inputs
    current_portfolio_value: Optional[Decimal] = Field(None, ge=0)

    monthly_contribution: Decimal = Field(..., ge=0)

    years: int = Field(..., ge=1, le=80)

    # Return assumptions
    annual_return: Decimal = Field(..., ge=0)
    volatility: Optional[Decimal] = Field(None, ge=0)

    # Monte Carlo simulations
    simulations: int = Field(default=1000, ge=100, le=100000)

    # Optional asset allocation
    allocations: Optional[List[AssetAllocation]] = None

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

class PortfolioResponse(BaseModel):

    schema_version: str = "2.0"
    engine_version: str

    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    # Context
    currency: str
    region: Optional[str] = None

    # Inputs
    monthly_contribution: Decimal
    years: int

    # Portfolio projections
    projected_value: Decimal
    total_contributions: Decimal
    investment_growth: Decimal

    # Inflation-adjusted value
    real_value_adjusted: Optional[Decimal] = None

    # Monte Carlo output
    monte_carlo: Optional[MonteCarloSummary] = None

    # Assumptions used
    assumptions_used: Optional[PortfolioAssumptions] = None

    # Confidence level
    projection_confidence: Optional[
        Literal["low", "medium", "high"]
    ] = None

    # Data completeness
    data_completeness: Optional[Decimal] = None

    # Currency validator
    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return validate_iso_currency(v)

    model_config = {"frozen": True}