from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import Literal

from pydantic import BaseModel

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.portfolio_growth import evaluate_portfolio_growth, PortfolioAssumptions
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "decision_delta_engine_v3"


# --------------------------------------------------
# Models
# --------------------------------------------------

class DecisionDeltaBand(BaseModel):

    label: Literal[
        "wealth_increasing",
        "neutral",
        "wealth_reducing",
        "wealth_destroying"
    ]

    min_delta: float
    max_delta: float

    model_config = {"frozen": True}


class DecisionDeltaResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    wealth_if_purchase: float

    wealth_if_not_purchase: float

    wealth_delta: float

    delta_band: DecisionDeltaBand

    years: int

    policy_versions: dict[str, str]

    summary: str

    recommendation: str

    model_config = {"frozen": True}


# --------------------------------------------------
# Banding
# --------------------------------------------------

def _band(delta: float) -> DecisionDeltaBand:

    if delta >= 100_000:
        return DecisionDeltaBand(
            label="wealth_increasing",
            min_delta=100_000,
            max_delta=1e12
        )

    if delta >= -25_000:
        return DecisionDeltaBand(
            label="neutral",
            min_delta=-25_000,
            max_delta=100_000
        )

    if delta >= -250_000:
        return DecisionDeltaBand(
            label="wealth_reducing",
            min_delta=-250_000,
            max_delta=-25_000
        )

    return DecisionDeltaBand(
        label="wealth_destroying",
        min_delta=-1e12,
        max_delta=-250_000
    )


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(delta: float, years: int) -> str:

    if delta >= 100_000:
        return (
            f"This decision improves projected long-term wealth by approximately "
            f"{delta:,.0f} over {years} years."
        )

    if delta >= -25_000:
        return "This decision has minimal long-term wealth impact."

    if delta >= -250_000:
        return (
            f"This decision reduces projected long-term wealth by approximately "
            f"{abs(delta):,.0f} over {years} years."
        )

    return (
        f"This decision materially reduces long-term wealth by approximately "
        f"{abs(delta):,.0f} over {years} years."
    )


def _recommendation(delta: float) -> str:

    if delta >= 100_000:
        return (
            "From a purely financial perspective this decision appears wealth enhancing."
        )

    if delta >= -25_000:
        return (
            "This decision appears financially neutral. Personal utility may be the primary factor."
        )

    if delta >= -250_000:
        return (
            "Consider whether the lifestyle value of this purchase outweighs the financial tradeoff."
        )

    return (
        "This purchase may significantly reduce long-term financial independence."
    )


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_decision_delta(
    req: CommitmentLockRequest,
) -> DecisionDeltaResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions else {}

    years = 30

    # --------------------------------------------------
    # Extract request values safely
    # --------------------------------------------------

    monthly_payment = float(getattr(req, "monthly_payment", 0))

    free_cashflow = float(getattr(req, "current_free_cashflow", 0))

    free_cashflow = max(free_cashflow, 0)

    annual_return = float(getattr(req, "annual_return_assumption", 0.07))

    annual_return = max(0.01, min(annual_return, 0.12))


    # --------------------------------------------------
    # Scenario A — Purchase
    # --------------------------------------------------

    investable_after_purchase = max(free_cashflow - monthly_payment, 0)

    purchase_portfolio = evaluate_portfolio_growth(
        PortfolioAssumptions(
            monthly_contribution=investable_after_purchase,
            years=years,
            annual_return=annual_return,
        )
    )

    wealth_if_purchase = float(getattr(purchase_portfolio, "median_wealth", 0.0))


    # --------------------------------------------------
    # Scenario B — No Purchase
    # --------------------------------------------------

    investable_without_purchase = free_cashflow

    invest_portfolio = evaluate_portfolio_growth(
        PortfolioAssumptions(
            monthly_contribution=investable_without_purchase,
            years=years,
            annual_return=annual_return,
        )
    )

    wealth_if_not_purchase = float(getattr(invest_portfolio, "median_wealth", 0.0))


    # --------------------------------------------------
    # Delta
    # --------------------------------------------------

    wealth_delta = wealth_if_not_purchase - wealth_if_purchase

    band = _band(wealth_delta)

    summary = _summary(wealth_delta, years)

    recommendation = _recommendation(wealth_delta)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return DecisionDeltaResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        wealth_if_purchase=round(wealth_if_purchase, 2),

        wealth_if_not_purchase=round(wealth_if_not_purchase, 2),

        wealth_delta=round(wealth_delta, 2),

        delta_band=band,

        years=years,

        policy_versions=policy_versions,

        summary=summary,

        recommendation=recommendation,
    )