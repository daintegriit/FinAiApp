from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "shock_simulator_v3"


# --------------------------------------------------
# Constants
# --------------------------------------------------

MAX_SURVIVAL_MONTHS = 999
EPSILON = 1e-6


# --------------------------------------------------
# Models
# --------------------------------------------------

class ShockScenario(BaseModel):

    name: str
    income_drop: float = Field(..., ge=0, le=1)
    duration_months: int
    resulting_income: float
    months_until_cash_exhausted: int
    survival_score: int

    model_config = {"frozen": True}


class ShockBand(BaseModel):

    label: Literal[
        "resilient",
        "moderate_risk",
        "fragile",
        "critical",
    ]

    min_score: int
    max_score: int

    model_config = {"frozen": True}


class ShockSimulatorResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    shock_score: int = Field(..., ge=0, le=100)

    shock_band: ShockBand

    scenarios: List[ShockScenario]

    policy_versions: dict[str, str]

    supporting_engines: dict[str, object]

    summary: str

    recommendations: List[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Utilities
# --------------------------------------------------

def _clamp(x: float, lo: int = 0, hi: int = 100):
    return max(lo, min(hi, int(round(x))))


def _band(score: int) -> ShockBand:

    if score < 25:
        return ShockBand(label="resilient", min_score=0, max_score=24)

    if score < 50:
        return ShockBand(label="moderate_risk", min_score=25, max_score=49)

    if score < 75:
        return ShockBand(label="fragile", min_score=50, max_score=74)

    return ShockBand(label="critical", min_score=75, max_score=100)


# --------------------------------------------------
# Survival Scoring Model
# --------------------------------------------------

def _survival_score(months: int) -> int:

    if months >= 120:
        return 0

    if months >= 60:
        return 10

    if months >= 24:
        return 30

    if months >= 12:
        return 50

    if months >= 6:
        return 70

    if months >= 3:
        return 85

    if months >= 1:
        return 95

    return 100


# --------------------------------------------------
# Shock math
# --------------------------------------------------

def _simulate_cash_survival(
    income: float,
    income_drop: float,
    monthly_commitment: float,
    free_cashflow: float,
):

    shocked_income = income * (1 - income_drop)

    monthly_balance = shocked_income - monthly_commitment

    if monthly_balance >= 0:
        return MAX_SURVIVAL_MONTHS

    deficit = abs(monthly_balance)

    if deficit < EPSILON:
        return MAX_SURVIVAL_MONTHS

    if free_cashflow <= 0:
        return 0

    survival = int(free_cashflow / deficit)

    return min(survival, MAX_SURVIVAL_MONTHS)


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(band: str):

    if band == "resilient":
        return (
            "Financial structure appears resilient under modeled income shock scenarios."
        )

    if band == "moderate_risk":
        return (
            "Financial structure shows moderate vulnerability to income disruption."
        )

    if band == "fragile":
        return (
            "Income shocks could quickly create financial stress due to limited liquidity."
        )

    return (
        "Financial survival under income shock scenarios appears critically limited."
    )


def _recommendations(band: str):

    recs: List[str] = []

    if band == "fragile":

        recs.append(
            "Building a larger liquidity buffer could improve resilience to income shocks."
        )

    if band == "critical":

        recs.append(
            "Reducing fixed financial commitments may significantly improve survival under income disruption."
        )

        recs.append(
            "Establishing a dedicated emergency reserve could reduce short-term financial risk."
        )

    if band == "resilient":

        recs.append(
            "Current financial structure appears resilient under modeled income shocks."
        )

    return recs


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_shock_simulator(
    req: CommitmentLockRequest,
) -> ShockSimulatorResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions else {}

    commitment = evaluate_commitment_lock(req)

    income = float(req.net_monthly_income)

    monthly_commitment = float(req.monthly_payment)

    free_cashflow = float(req.current_free_cashflow)

    scenarios_def = [
        ("mild_income_drop", 0.1, 6),
        ("moderate_income_drop", 0.25, 6),
        ("severe_income_drop", 0.5, 6),
        ("job_loss", 0.9, 6),
    ]

    scenarios: List[ShockScenario] = []

    worst_survival = MAX_SURVIVAL_MONTHS

    for name, drop, duration in scenarios_def:

        shocked_income = income * (1 - drop)

        survival = _simulate_cash_survival(
            income,
            drop,
            monthly_commitment,
            free_cashflow,
        )

        survival_score = _survival_score(survival)

        worst_survival = min(worst_survival, survival)

        scenarios.append(

            ShockScenario(
                name=name,
                income_drop=drop,
                duration_months=duration,
                resulting_income=round(shocked_income, 2),
                months_until_cash_exhausted=survival,
                survival_score=survival_score,
            )
        )

    shock_score = _survival_score(worst_survival)

    band = _band(shock_score)

    summary = _summary(band.label)

    recs = _recommendations(band.label)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return ShockSimulatorResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        shock_score=shock_score,

        shock_band=band,

        scenarios=scenarios,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment
        },

        summary=summary,

        recommendations=recs,
    )