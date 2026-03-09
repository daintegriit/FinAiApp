from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import List, Literal, Any

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions
from app.engines.engine_registry import register_engine


ENGINE_VERSION = "behavioral_drift_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class BehaviorSignal(BaseModel):

    signal: str
    previous_value: float
    current_value: float
    change: float
    interpretation: str

    model_config = {"frozen": True}


class DriftBand(BaseModel):

    label: Literal[
        "improving",
        "stable",
        "early_drift",
        "concerning_drift",
    ]

    min_score: int
    max_score: int

    model_config = {"frozen": True}


class BehavioralDriftResponse(BaseModel):

    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    drift_score: int = Field(..., ge=0, le=100)

    drift_band: DriftBand

    signals: List[BehaviorSignal]

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


def _safe_get(obj: Any, field: str, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(field, default)
    return getattr(obj, field, default)


def _band(score: int) -> DriftBand:

    if score < 25:
        return DriftBand(label="improving", min_score=0, max_score=24)

    if score < 45:
        return DriftBand(label="stable", min_score=25, max_score=44)

    if score < 70:
        return DriftBand(label="early_drift", min_score=45, max_score=69)

    return DriftBand(label="concerning_drift", min_score=70, max_score=100)


# --------------------------------------------------
# Interpretation
# --------------------------------------------------

def _interpret(signal: str, change: float):

    if abs(change) < 0.02:
        return "behavior stable"

    if change > 0:

        if signal == "income_commitment_ratio":
            return "commitment burden increasing"

        if signal == "free_cashflow_ratio":
            return "cashflow pressure increasing"

        return "financial pressure increasing"

    return "financial position improving"


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(band: str):

    if band == "improving":
        return (
            "Financial behavior appears to be improving over time with "
            "greater flexibility and reduced commitment pressure."
        )

    if band == "stable":
        return (
            "Financial behavior appears relatively stable with no "
            "major structural drift detected."
        )

    if band == "early_drift":
        return (
            "Early signs of financial drift are emerging. Commitment "
            "pressure or reduced flexibility may be increasing."
        )

    return (
        "Behavioral drift suggests financial pressure is increasing. "
        "Monitoring spending and commitments may be advisable."
    )


def _recommendations(band: str):

    recs: List[str] = []

    if band == "early_drift":

        recs.append(
            "Monitor new recurring commitments to prevent lifestyle inflation."
        )

    if band == "concerning_drift":

        recs.append(
            "Reducing fixed expenses may help restore financial flexibility."
        )

        recs.append(
            "Review spending trends and identify areas of structural cost growth."
        )

    if band == "improving":

        recs.append(
            "Current financial trajectory appears positive."
        )

    return recs


# --------------------------------------------------
# Engine
# --------------------------------------------------

@register_engine("behavioral_drift")
def evaluate_behavioral_drift(
    req: CommitmentLockRequest,
) -> BehavioralDriftResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions else {}

    commitment = evaluate_commitment_lock(req)

    income_share = _safe_get(commitment, "income_share", 0.0) or 0.0
    free_cashflow_share = _safe_get(commitment, "free_cashflow_share", 0.0) or 0.0


    # --------------------------------------------------
    # Placeholder historical baseline
    # --------------------------------------------------

    previous_income_share = income_share * 0.9
    previous_cashflow_share = free_cashflow_share * 0.9


    signals = [

        BehaviorSignal(
            signal="income_commitment_ratio",
            previous_value=previous_income_share,
            current_value=income_share,
            change=income_share - previous_income_share,
            interpretation=_interpret(
                "income_commitment_ratio",
                income_share - previous_income_share,
            ),
        ),

        BehaviorSignal(
            signal="free_cashflow_ratio",
            previous_value=previous_cashflow_share,
            current_value=free_cashflow_share,
            change=free_cashflow_share - previous_cashflow_share,
            interpretation=_interpret(
                "free_cashflow_ratio",
                free_cashflow_share - previous_cashflow_share,
            ),
        ),
    ]


    total_change = sum(abs(s.change) for s in signals)

    drift_score = _clamp(total_change * 200)

    band = _band(drift_score)

    summary = _summary(band.label)

    recs = _recommendations(band.label)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return BehavioralDriftResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        drift_score=drift_score,

        drift_band=band,

        signals=signals,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment
        },

        summary=summary,

        recommendations=recs,
    )