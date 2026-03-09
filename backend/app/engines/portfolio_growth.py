from __future__ import annotations

import time
import uuid
import random
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


ENGINE_VERSION = "portfolio_growth_v2"


# --------------------------------------------------
# Models
# --------------------------------------------------

class PortfolioAssumptions(BaseModel):

    monthly_contribution: float

    years: int

    annual_return: float = Field(
        default=0.07,
        description="Expected annual return"
    )

    volatility: float = Field(
        default=0.15,
        description="Annual market volatility"
    )

    simulations: int = 500

    model_config = {"frozen": True}


class PortfolioOutcome(BaseModel):

    median_wealth: float

    worst_case: float

    best_case: float

    percentile_10: float

    percentile_90: float

    model_config = {"frozen": True}


class PortfolioGrowthResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    median_wealth: float

    outcome: PortfolioOutcome

    model_config = {"frozen": True}


# --------------------------------------------------
# Monte Carlo Simulation
# --------------------------------------------------

def _simulate_portfolio(
    monthly: float,
    years: int,
    annual_return: float,
    volatility: float,
    simulations: int,
):

    months = years * 12

    results = []

    monthly_return_mean = annual_return / 12
    monthly_volatility = volatility / (12 ** 0.5)

    for _ in range(simulations):

        value = 0.0

        for _ in range(months):

            monthly_return = random.gauss(
                monthly_return_mean,
                monthly_volatility,
            )

            value = value * (1 + monthly_return)

            value += monthly

        results.append(value)

    results.sort()

    return results


# --------------------------------------------------
# Percentile Helper
# --------------------------------------------------

def _percentile(data: List[float], p: float):

    index = int(p * (len(data) - 1))

    return data[index]


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_portfolio_growth(
    assumptions: PortfolioAssumptions,
) -> PortfolioGrowthResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    results = _simulate_portfolio(
        assumptions.monthly_contribution,
        assumptions.years,
        assumptions.annual_return,
        assumptions.volatility,
        assumptions.simulations,
    )

    median = _percentile(results, 0.5)

    worst = results[0]

    best = results[-1]

    p10 = _percentile(results, 0.1)

    p90 = _percentile(results, 0.9)

    outcome = PortfolioOutcome(
        median_wealth=round(median, 2),
        worst_case=round(worst, 2),
        best_case=round(best, 2),
        percentile_10=round(p10, 2),
        percentile_90=round(p90, 2),
    )

    processing_ms = int((time.perf_counter() - start) * 1000)

    return PortfolioGrowthResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        median_wealth=round(median, 2),
        outcome=outcome,
    )