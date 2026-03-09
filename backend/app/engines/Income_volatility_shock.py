from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Optional, Literal, List

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "income_volatility_v1"


# --------------------------------------------------
# Response Models
# --------------------------------------------------

class ShockScenario(BaseModel):

    name: str

    income_drop: float = Field(..., ge=0, le=1)

    resulting_income: float

    commitment_share: float

    stress_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class VolatilityBand(BaseModel):

    label: Literal["stable", "moderate_risk", "high_risk", "critical"]

    min_score: int = Field(..., ge=0, le=100)

    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class IncomeVolatilityResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    volatility_score: int = Field(..., ge=0, le=100)

    volatility_band: VolatilityBand

    volatility_confidence: Literal["low", "medium", "high"]

    shock_scenarios: List[ShockScenario]

    policy_versions: dict[str, str]

    supporting_engines: dict[str, object]

    summary: str

    recommendations: list[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Utility
# --------------------------------------------------

def _clamp(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))


def _safe_get(obj: object, field: str, default=None):

    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(field, default)

    return getattr(obj, field, default)


def _band(score: int) -> VolatilityBand:

    if score < 30:
        return VolatilityBand(label="stable", min_score=0, max_score=29)

    if score < 55:
        return VolatilityBand(label="moderate_risk", min_score=30, max_score=54)

    if score < 75:
        return VolatilityBand(label="high_risk", min_score=55, max_score=74)

    return VolatilityBand(label="critical", min_score=75, max_score=100)


# --------------------------------------------------
# Scenario Simulation
# --------------------------------------------------

def _simulate_scenario(
    name: str,
    income_drop: float,
    base_income: float,
    monthly_payment: float,
) -> ShockScenario:

    resulting_income = base_income * (1 - income_drop)

    if resulting_income <= 0:
        commitment_share = 1.0
    else:
        commitment_share = monthly_payment / resulting_income

    stress_score = _clamp(commitment_share * 120)

    return ShockScenario(
        name=name,
        income_drop=income_drop,
        resulting_income=resulting_income,
        commitment_share=commitment_share,
        stress_score=stress_score,
    )


# --------------------------------------------------
# Summary + Advice
# --------------------------------------------------

def _summary(score: int, band: str) -> str:

    if band == "stable":
        return (
            "Income volatility appears manageable under moderate stress scenarios. "
            "Current commitments remain sustainable even with partial income reduction."
        )

    if band == "moderate_risk":
        return (
            "Income shocks could place noticeable pressure on financial commitments. "
            "Maintaining liquidity buffers is recommended."
        )

    if band == "high_risk":
        return (
            "Income volatility presents meaningful risk. A moderate income disruption "
            "would significantly increase commitment burden."
        )

    return (
        "Income volatility risk is critical. Even small disruptions could compromise "
        "the ability to sustain current obligations."
    )


def _recommendations(score: int) -> list[str]:

    recs: list[str] = []

    if score >= 70:

        recs.append(
            "Build a larger emergency fund capable of covering at least 6 months of obligations."
        )

        recs.append(
            "Avoid adding additional recurring commitments until income stability improves."
        )

    elif score >= 50:

        recs.append(
            "Maintain a liquidity buffer to protect against short-term income disruptions."
        )

    else:

        recs.append(
            "Current commitments appear resilient under moderate income variability."
        )

    return recs


# --------------------------------------------------
# Public Entry
# --------------------------------------------------

def evaluate_income_volatility(
    req: CommitmentLockRequest,
) -> IncomeVolatilityResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()

    commitment_result = evaluate_commitment_lock(req)

    net_income = _safe_get(commitment_result, "income_share", None)

    monthly_income = req.net_monthly_income

    if monthly_income is None and req.context is not None:
        monthly_income = _safe_get(commitment_result, "income_share", None)

    if monthly_income is None:
        monthly_income = 4000

    monthly_payment = req.monthly_payment

    scenarios = [

        _simulate_scenario("mild_income_drop", 0.10, monthly_income, monthly_payment),

        _simulate_scenario("moderate_income_drop", 0.25, monthly_income, monthly_payment),

        _simulate_scenario("severe_income_drop", 0.50, monthly_income, monthly_payment),

        _simulate_scenario("job_loss", 0.80, monthly_income, monthly_payment),
    ]

    avg_stress = sum(s.stress_score for s in scenarios) / len(scenarios)

    volatility_score = _clamp(avg_stress)

    band = _band(volatility_score)

    confidence = "medium"

    summary = _summary(volatility_score, band.label)

    recs = _recommendations(volatility_score)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return IncomeVolatilityResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        volatility_score=volatility_score,

        volatility_band=band,

        volatility_confidence=confidence,

        shock_scenarios=scenarios,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment_result
        },

        summary=summary,

        recommendations=recs,
    )