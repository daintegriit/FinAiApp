from __future__ import annotations

from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --------------------------------------------------
# Scenario Shock Parameters
# --------------------------------------------------

class ScenarioShock(BaseModel):

    market_return_shift: Optional[Decimal] = Field(
        None,
        description="Change in annual market return"
    )

    inflation_shift: Optional[Decimal] = Field(
        None,
        description="Change in inflation rate"
    )

    income_change: Optional[Decimal] = Field(
        None,
        description="Change in monthly income"
    )

    unemployment_months: Optional[int] = Field(
        None,
        ge=0,
        le=60,
        description="Months of unemployment"
    )

    model_config = {"frozen": True}


# --------------------------------------------------
# Scenario Input
# --------------------------------------------------

class ScenarioInput(BaseModel):

    scenario_name: str = Field(
        description="Name of the scenario"
    )

    scenario_type: Optional[
        Literal[
            "market_crash",
            "recession",
            "inflation_spike",
            "income_loss",
            "custom"
        ]
    ] = None

    years: int = Field(
        gt=0,
        le=60,
        description="Simulation horizon"
    )

    initial_portfolio_value: Optional[Decimal] = Field(
        None,
        ge=0
    )

    monthly_contribution: Optional[Decimal] = Field(
        None,
        ge=0
    )

    expected_return: Decimal = Field(
        default=Decimal("0.07"),
        description="Baseline expected annual return"
    )

    volatility: Decimal = Field(
        default=Decimal("0.15"),
        ge=0
    )

    shock: Optional[ScenarioShock] = None

    simulations: int = Field(
        default=1000,
        ge=100,
        le=100000
    )


# --------------------------------------------------
# Scenario Result
# --------------------------------------------------

class ScenarioResult(BaseModel):

    scenario_name: str

    projected_value: Decimal
    worst_case_value: Decimal
    best_case_value: Decimal

    probability_of_loss: Optional[Decimal] = None

    financial_score: Optional[Decimal] = None

    model_config = {"frozen": True}


# --------------------------------------------------
# Scenario Engine Response
# --------------------------------------------------

class ScenarioEngineResponse(BaseModel):

    schema_version: str = "2.0"

    engine_version: str

    generated_at: Optional[datetime] = None
    processing_ms: Optional[int] = None

    results: List[ScenarioResult]