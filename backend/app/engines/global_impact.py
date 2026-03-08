from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.policy_registry import get_policy_versions
from app.core.config import settings


ENGINE_VERSION = "global_impact_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class WealthProjection(BaseModel):

    years: int

    baseline_wealth: float

    commitment_wealth: float

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
        return ImpactBand("minimal_impact", 0, 24)

    if score < 50:
        return ImpactBand("moderate_impact", 25, 49)

    if score < 75:
        return ImpactBand("significant_impact", 50, 74)

    return ImpactBand("severe_impact", 75, 100)


# --------------------------------------------------
# Financial math
# --------------------------------------------------

def future_value(monthly: float, years: int, annual_return: float):

    r = annual_return / 12

    n = years * 12

    return monthly * ((1 + r) ** n - 1) / r


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(score: int, band: str) -> str:

    if band == "minimal_impact":

        return (
            "The financial commitment has limited long-term impact on wealth "
            "trajectory when evaluated against typical investment growth assumptions."
        )

    if band == "moderate_impact":

        return (
            "The commitment introduces a moderate long-term drag on wealth "
            "accumulation due to capital allocation toward recurring payments."
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

    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()

    commitment = evaluate_commitment_lock(req)

    monthly_payment = req.monthly_payment

    annual_return = (
        req.annual_return_assumption
        if req.annual_return_assumption
        else settings.DEFAULT_ANNUAL_RETURN
    )


    projection_years = [5, 10, 20, 30]

    projections: List[WealthProjection] = []

    total_cost = 0


    for years in projection_years:

        baseline = future_value(monthly_payment, years, annual_return)

        commitment_wealth = 0

        opportunity = baseline - commitment_wealth

        total_cost += opportunity

        projections.append(

            WealthProjection(
                years=years,
                baseline_wealth=round(baseline, 2),
                commitment_wealth=0,
                opportunity_cost=round(opportunity, 2),
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
            "commitment_lock": commitment
        },

        summary=summary,

        recommendations=recs,
    )