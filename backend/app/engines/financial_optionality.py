from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Optional, Literal, List, Any

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_optionality_v1"


# --------------------------------------------------
# Response Models
# --------------------------------------------------

class OptionalityFactor(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    weighted_score: float = Field(..., ge=0, le=100)
    confidence: Literal["low", "medium", "high"]
    notes: Optional[str] = None

    model_config = {"frozen": True}


class OptionalityBand(BaseModel):
    label: Literal["restricted", "constrained", "flexible", "highly_flexible"]
    min_score: int = Field(..., ge=0, le=100)
    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class FinancialOptionalityResponse(BaseModel):
    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    optionality_score: int = Field(..., ge=0, le=100)
    optionality_confidence: Literal["low", "medium", "high"]
    optionality_band: OptionalityBand

    factor_scores: List[OptionalityFactor]

    policy_versions: dict[str, str]
    supporting_engines: dict[str, object]

    summary: str
    recommendations: list[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def _clamp_int(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))


def _safe_get(obj: Any, field: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(field, default)
    return getattr(obj, field, default)


def _normalize_confidence(value: Optional[str], default: Literal["low", "medium", "high"] = "medium") -> Literal["low", "medium", "high"]:
    if value in ("low", "medium", "high"):
        return value
    return default


def _band_for_score(score: int) -> OptionalityBand:
    if score < 30:
        return OptionalityBand(label="restricted", min_score=0, max_score=29)
    if score < 55:
        return OptionalityBand(label="constrained", min_score=30, max_score=54)
    if score < 80:
        return OptionalityBand(label="flexible", min_score=55, max_score=79)
    return OptionalityBand(label="highly_flexible", min_score=80, max_score=100)


def _derive_confidence(commitment_result: object) -> Literal["low", "medium", "high"]:
    tax_conf = _normalize_confidence(_safe_get(commitment_result, "tax_confidence", None), default="medium")
    lock_conf = _normalize_confidence(_safe_get(commitment_result, "lock_score_confidence", None), default="medium")

    vals = [tax_conf, lock_conf]

    if "low" in vals:
        return "low"
    if "medium" in vals:
        return "medium"
    return "high"


# --------------------------------------------------
# Factor Scoring
# --------------------------------------------------

def _score_commitment_flexibility(commitment_result: object) -> OptionalityFactor:
    """
    High commitment lock reduces life flexibility.
    """
    lock_score = _safe_get(commitment_result, "lock_score", 50)
    confidence = _normalize_confidence(
        _safe_get(commitment_result, "lock_score_confidence", None),
        default="medium",
    )

    score = _clamp_int(100 - float(lock_score))
    weight = 0.45

    return OptionalityFactor(
        name="commitment_flexibility",
        score=score,
        weight=weight,
        weighted_score=round(score * weight, 2),
        confidence=confidence,
        notes="Derived inversely from commitment lock score.",
    )


def _score_income_flexibility(commitment_result: object) -> OptionalityFactor:
    """
    Lower income burden means more room to change jobs, relocate, or absorb uncertainty.
    """
    income_share = _safe_get(commitment_result, "income_share", None)
    confidence = _normalize_confidence(
        _safe_get(commitment_result, "tax_confidence", None),
        default="medium",
    )

    if income_share is None:
        score = 50
        note = "Neutral fallback used because income_share was unavailable."
    else:
        burden = min(max(float(income_share), 0.0), 1.0)
        score = _clamp_int(100 - (burden * 140))
        note = "Derived from commitment burden relative to monthly income."

    weight = 0.25

    return OptionalityFactor(
        name="income_flexibility",
        score=score,
        weight=weight,
        weighted_score=round(score * weight, 2),
        confidence=confidence,
        notes=note,
    )


def _score_liquidity_flexibility(commitment_result: object) -> OptionalityFactor:
    """
    If a commitment consumes most free cashflow, optionality collapses.
    """
    free_cashflow_share = _safe_get(commitment_result, "free_cashflow_share", None)
    confidence = _normalize_confidence(
        _safe_get(commitment_result, "lock_score_confidence", None),
        default="medium",
    )

    if free_cashflow_share is None:
        score = 50
        note = "Neutral fallback used because free_cashflow_share was unavailable."
    else:
        burden = min(max(float(free_cashflow_share), 0.0), 2.0)
        score = _clamp_int(100 - (burden * 100))
        note = "Derived from commitment burden relative to free cashflow."

    weight = 0.30

    return OptionalityFactor(
        name="liquidity_flexibility",
        score=score,
        weight=weight,
        weighted_score=round(score * weight, 2),
        confidence=confidence,
        notes=note,
    )


# --------------------------------------------------
# Summary / Recommendations
# --------------------------------------------------

def _build_summary(optionality_score: int, band_label: str, commitment_lock_score: int) -> str:
    if band_label == "restricted":
        return (
            f"Financial optionality is currently restricted. Existing commitments significantly reduce "
            f"the ability to pivot, relocate, or absorb life changes. Commitment rigidity remains a major "
            f"constraint (commitment lock score: {commitment_lock_score})."
        )

    if band_label == "constrained":
        return (
            f"Financial optionality is constrained. The current profile leaves limited room for new obligations "
            f"or major life transitions, especially if income or expenses change unexpectedly "
            f"(commitment lock score: {commitment_lock_score})."
        )

    if band_label == "flexible":
        return (
            f"Financial optionality is flexible. The current financial structure appears capable of supporting "
            f"moderate changes without immediately compromising stability, though maintaining liquidity remains important "
            f"(commitment lock score: {commitment_lock_score})."
        )

    return (
        f"Financial optionality is highly flexible. The current structure preserves strong freedom of movement, "
        f"decision-making capacity, and room for future opportunities "
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
            "Preserve optionality by avoiding additional recurring obligations that consume most discretionary cashflow."
        )

    if income_share is not None and income_share >= 0.15:
        recs.append(
            "Consider whether this commitment can be shortened, reduced, or replaced with a lower fixed monthly obligation."
        )

    if commitment_lock_score >= 60:
        recs.append(
            "Stress-test this decision against job change, relocation, emergency spending, or economic downturn scenarios."
        )

    if not recs:
        recs.append(
            "Maintain flexibility by keeping recurring commitments low relative to income and discretionary cashflow."
        )

    return recs


# --------------------------------------------------
# Public Entry Point
# --------------------------------------------------

def evaluate_optionality(req: CommitmentLockRequest) -> FinancialOptionalityResponse:
    start_time = time.perf_counter()
    request_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions is not None else {}

    commitment_result = evaluate_commitment_lock(req)

    commitment_factor = _score_commitment_flexibility(commitment_result)
    income_factor = _score_income_flexibility(commitment_result)
    liquidity_factor = _score_liquidity_flexibility(commitment_result)

    factors = [
        commitment_factor,
        income_factor,
        liquidity_factor,
    ]

    raw_score = sum(f.weighted_score for f in factors)
    optionality_score = _clamp_int(raw_score)

    optionality_band = _band_for_score(optionality_score)
    optionality_confidence = _derive_confidence(commitment_result)

    summary = _build_summary(
        optionality_score=optionality_score,
        band_label=optionality_band.label,
        commitment_lock_score=int(_safe_get(commitment_result, "lock_score", 50)),
    )

    recommendations = _build_recommendations(
        commitment_lock_score=int(_safe_get(commitment_result, "lock_score", 50)),
        free_cashflow_share=_safe_get(commitment_result, "free_cashflow_share", None),
        income_share=_safe_get(commitment_result, "income_share", None),
    )

    processing_ms = int((time.perf_counter() - start_time) * 1000)

    return FinancialOptionalityResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        optionality_score=optionality_score,
        optionality_confidence=optionality_confidence,
        optionality_band=optionality_band,
        factor_scores=factors,
        policy_versions=policy_versions,
        supporting_engines={
            "commitment_lock": commitment_result,
        },
        summary=summary,
        recommendations=recommendations,
    )