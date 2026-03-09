from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Literal

from pydantic import BaseModel, Field

from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions
from app.schemas.commitment_lock import CommitmentLockRequest


ENGINE_VERSION = "financial_resilience_v1"


# --------------------------------------------------
# Response Schemas
# --------------------------------------------------

class ResilienceComponent(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    weighted_score: float = Field(..., ge=0, le=100)
    confidence: Literal["low", "medium", "high"]
    notes: Optional[str] = None

    model_config = {"frozen": True}


class ResilienceBand(BaseModel):
    label: Literal["critical", "fragile", "stable", "strong"]
    min_score: int = Field(..., ge=0, le=100)
    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class FinancialResilienceResponse(BaseModel):
    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    resilience_score: int = Field(..., ge=0, le=100)
    resilience_confidence: Literal["low", "medium", "high"]
    resilience_band: ResilienceBand

    component_scores: list[ResilienceComponent]

    policy_versions: Dict[str, str]
    assumptions_used: Dict[str, float | str]

    supporting_engines: Dict[str, Any]

    summary: str
    recommendations: list[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Utility helpers
# --------------------------------------------------

def _clamp_int(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))


def _safe_get(d: Any, field: str, default: Any = None) -> Any:
    if d is None:
        return default
    if isinstance(d, dict):
        return d.get(field, default)
    return getattr(d, field, default)


def _band_for_score(score: int) -> ResilienceBand:
    if score < 30:
        return ResilienceBand(label="critical", min_score=0, max_score=29)
    if score < 55:
        return ResilienceBand(label="fragile", min_score=30, max_score=54)
    if score < 75:
        return ResilienceBand(label="stable", min_score=55, max_score=74)
    return ResilienceBand(label="strong", min_score=75, max_score=100)


def _derive_confidence(
    tax_confidence: Optional[str],
    lock_score_confidence: Optional[str],
) -> Literal["low", "medium", "high"]:
    values = [v for v in [tax_confidence, lock_score_confidence] if v is not None]

    if not values:
        return "low"
    if "low" in values:
        return "low"
    if "medium" in values:
        return "medium"
    return "high"


def _build_summary(score: int, band: str, commitment_lock_score: int) -> str:
    if band == "critical":
        return (
            f"Financial resilience is currently critical. The system detected a high degree "
            f"of fragility, with commitment pressure contributing materially to the outcome "
            f"(commitment lock score: {commitment_lock_score})."
        )
    if band == "fragile":
        return (
            f"Financial resilience is fragile. Core obligations appear manageable on paper, "
            f"but flexibility is limited and additional commitments could materially worsen risk "
            f"(commitment lock score: {commitment_lock_score})."
        )
    if band == "stable":
        return (
            f"Financial resilience is stable. The current profile suggests moderate capacity to "
            f"absorb obligations, though maintaining flexibility and liquidity remains important "
            f"(commitment lock score: {commitment_lock_score})."
        )
    return (
        f"Financial resilience is strong. Current obligations appear supportable relative to the "
        f"available financial profile, with good remaining flexibility "
        f"(commitment lock score: {commitment_lock_score})."
    )


def _build_recommendations(
    commitment_lock_score: int,
    free_cashflow_share: Optional[float],
    income_share: Optional[float],
) -> list[str]:
    recs: list[str] = []

    if free_cashflow_share is not None and free_cashflow_share >= 0.8:
        recs.append(
            "Reduce or defer new recurring obligations because the commitment consumes most available free cashflow."
        )

    if income_share is not None and income_share >= 0.15:
        recs.append(
            "Review whether this commitment can be reduced, shortened, or replaced with a lower fixed monthly obligation."
        )

    if commitment_lock_score >= 60:
        recs.append(
            "Model this decision under stress scenarios such as income interruption, inflation pressure, or emergency spending before committing."
        )

    if not recs:
        recs.append(
            "Maintain current flexibility by monitoring recurring commitments and preserving discretionary cashflow."
        )

    return recs


# --------------------------------------------------
# Core scoring logic
# --------------------------------------------------

def _score_commitment_component(commitment_result: Any) -> ResilienceComponent:
    lock_score = _safe_get(commitment_result, "lock_score", 50)
    lock_conf = _safe_get(commitment_result, "lock_score_confidence", "medium")

    # Commitment lock is inverse to resilience:
    # high lock score = lower resilience
    component_score = _clamp_int(100 - lock_score)

    weight = 0.50
    weighted_score = component_score * weight

    return ResilienceComponent(
        name="commitment_resilience",
        score=component_score,
        weight=weight,
        weighted_score=weighted_score,
        confidence=lock_conf,
        notes="Derived inversely from commitment lock pressure.",
    )


def _score_liquidity_component(commitment_result: Any) -> ResilienceComponent:
    free_cashflow_share = _safe_get(commitment_result, "free_cashflow_share", None)
    conf = _safe_get(commitment_result, "lock_score_confidence", "medium")

    if free_cashflow_share is None:
        score = 50
        note = "Liquidity score used neutral fallback because free cashflow share was unavailable."
    else:
        # Lower burden on free cashflow = better resilience
        burden = min(max(float(free_cashflow_share), 0.0), 2.0)
        score = _clamp_int(100 - (burden * 100))
        note = "Derived from commitment burden relative to available free cashflow."

    weight = 0.30
    weighted_score = score * weight

    return ResilienceComponent(
        name="liquidity_resilience",
        score=score,
        weight=weight,
        weighted_score=weighted_score,
        confidence=conf,
        notes=note,
    )


def _score_income_capacity_component(commitment_result: Any) -> ResilienceComponent:
    income_share = _safe_get(commitment_result, "income_share", None)
    tax_conf = _safe_get(commitment_result, "tax_confidence", None)

    if income_share is None:
        score = 50
        note = "Income capacity score used neutral fallback because income share was unavailable."
    else:
        burden = min(max(float(income_share), 0.0), 1.0)
        score = _clamp_int(100 - (burden * 100 * 1.5))
        note = "Derived from commitment burden relative to resolved monthly income."

    weight = 0.20
    weighted_score = score * weight

    return ResilienceComponent(
        name="income_capacity_resilience",
        score=score,
        weight=weight,
        weighted_score=weighted_score,
        confidence=tax_conf or "medium",
        notes=note,
    )


# --------------------------------------------------
# Public entry point
# --------------------------------------------------

def evaluate_financial_resilience(
    req: CommitmentLockRequest,
) -> FinancialResilienceResponse:
    start_time = time.perf_counter()
    request_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()

    commitment_result = evaluate_commitment_lock(req)

    commitment_component = _score_commitment_component(commitment_result)
    liquidity_component = _score_liquidity_component(commitment_result)
    income_component = _score_income_capacity_component(commitment_result)

    components = [
        commitment_component,
        liquidity_component,
        income_component,
    ]

    raw_score = sum(c.weighted_score for c in components)
    resilience_score = _clamp_int(raw_score)

    band = _band_for_score(resilience_score)

    resilience_confidence = _derive_confidence(
        tax_confidence=_safe_get(commitment_result, "tax_confidence", None),
        lock_score_confidence=_safe_get(commitment_result, "lock_score_confidence", None),
    )

    assumptions_used = {
        "annual_return": float(_safe_get(commitment_result, "annual_return_used", 0.07)),
        "annual_inflation": float(_safe_get(commitment_result, "annual_inflation_used", 0.02)),
        "resilience_method": "weighted_component_model_v1",
    }

    summary = _build_summary(
        score=resilience_score,
        band=band.label,
        commitment_lock_score=int(_safe_get(commitment_result, "lock_score", 50)),
    )

    recommendations = _build_recommendations(
        commitment_lock_score=int(_safe_get(commitment_result, "lock_score", 50)),
        free_cashflow_share=_safe_get(commitment_result, "free_cashflow_share", None),
        income_share=_safe_get(commitment_result, "income_share", None),
    )

    processing_ms = int((time.perf_counter() - start_time) * 1000)

    return FinancialResilienceResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        resilience_score=resilience_score,
        resilience_confidence=resilience_confidence,
        resilience_band=band,
        component_scores=components,
        policy_versions=policy_versions,
        assumptions_used=assumptions_used,
        supporting_engines={
            "commitment_lock": commitment_result,
        },
        summary=summary,
        recommendations=recommendations,
    )