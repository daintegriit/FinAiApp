from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import List, Literal, Any

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.portfolio_growth import (
    evaluate_portfolio_growth,
    PortfolioAssumptions,
)
from app.policy.tax_models.policy_registry import get_policy_versions
from app.core.config import settings


ENGINE_VERSION = "global_impact_v2"


# --------------------------------------------------
# Models
# --------------------------------------------------

class WealthProjection(BaseModel):

    years: int
    median_wealth: float
    worst_case: float
    best_case: float
    opportunity_cost: float

    model_config = {"frozen": True}


class ImpactBand(BaseModel):

    label: Literal[
        "minimal_impact",
        "moderate_impact",
        "significant_impact",
        "severe_impact",
    ]

    min_score: int
    max_score: int

    model_config = {"frozen": True}


class GlobalImpactResponse(BaseModel):

    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    impact_score: int = Field(..., ge=0, le=100)

    impact_band: ImpactBand

    projections: List[WealthProjection]

    lifetime_opportunity_cost: float

    policy_versions: dict[str, str]

    supporting_engines: dict[str, object]

    summary: str
    recommendations: List[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Utilities
# --------------------------------------------------

def _clamp(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))


def _band(score: int) -> ImpactBand:

    if score < 25:
        return ImpactBand(label="minimal_impact", min_score=0, max_score=24)

    if score < 50:
        return ImpactBand(label="moderate_impact", min_score=25, max_score=49)

    if score < 75:
        return ImpactBand(label="significant_impact", min_score=50, max_score=74)

    return ImpactBand(label="severe_impact", min_score=75, max_score=100)


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(score: int, band: str) -> str:

    if band == "minimal_impact":
        return (
            "The financial commitment has limited long-term impact on wealth "
            "trajectory when evaluated against simulated market outcomes."
        )

    if band == "moderate_impact":
        return (
            "The commitment introduces a moderate long-term drag on wealth "
            "accumulation based on simulated investment paths."
        )

    if band == "significant_impact":
        return (
            "The financial commitment materially affects long-term wealth "
            "growth and reduces capital available for investment."
        )

    return (
        "The commitment creates a large lifetime opportunity cost and "
        "substantially alters long-term financial trajectory."
    )


def _recommendations(score: int) -> List[str]:

    recs: List[str] = []

    if score >= 70:

        recs.append(
            "Consider reducing long-term fixed commitments to preserve investment capacity."
        )

        recs.append(
            "Evaluate whether the commitment produces value that justifies its lifetime opportunity cost."
        )

    elif score >= 50:

        recs.append(
            "Balancing commitments with investment contributions may improve long-term outcomes."
        )

    else:

        recs.append(
            "The commitment appears manageable within long-term wealth growth assumptions."
        )

    return recs


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_global_impact(
    req: CommitmentLockRequest,
) -> GlobalImpactResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions else {}

    commitment = evaluate_commitment_lock(req)

    monthly_payment = float(req.monthly_payment)

    annual_return = getattr(
        req,
        "annual_return_assumption",
        None,
    ) or settings.DEFAULT_ANNUAL_RETURN


    projection_years = [5, 10, 20, 30]

    projections: List[WealthProjection] = []


    for years in projection_years:

        assumptions = PortfolioAssumptions(
            monthly_contribution=monthly_payment,
            years=years,
            expected_return=annual_return,
            volatility=0.15,
            simulations=500,
        )

        portfolio = evaluate_portfolio_growth(assumptions)

        outcome = portfolio.outcome

        opportunity_cost = outcome.median_wealth

        projections.append(

            WealthProjection(
                years=years,
                median_wealth=round(outcome.median_wealth, 2),
                worst_case=round(outcome.worst_case, 2),
                best_case=round(outcome.best_case, 2),
                opportunity_cost=round(opportunity_cost, 2),
            )
        )


    lifetime_cost = projections[-1].opportunity_cost


    score = _clamp((lifetime_cost / 1_000_000) * 100)


    band = _band(score)

    summary = _summary(score, band.label)

    recs = _recommendations(score)


    processing_ms = int((time.perf_counter() - start) * 1000)


    return GlobalImpactResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        impact_score=score,

        impact_band=band,

        projections=projections,

        lifetime_opportunity_cost=round(lifetime_cost, 2),

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment,
        },

        summary=summary,

        recommendations=recs,
    )