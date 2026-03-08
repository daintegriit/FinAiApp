from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.policy_registry import get_policy_versions


ENGINE_VERSION = "peer_benchmark_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class PeerMetric(BaseModel):

    metric: str

    user_value: float

    peer_median: float

    percentile: int = Field(..., ge=0, le=100)

    interpretation: str

    model_config = {"frozen": True}


class PeerBand(BaseModel):

    label: Literal["strong", "average", "below_average", "weak"]

    min_score: int = Field(..., ge=0, le=100)

    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class PeerBenchmarkResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    peer_score: int = Field(..., ge=0, le=100)

    peer_band: PeerBand

    peer_metrics: List[PeerMetric]

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


def _band(score: int) -> PeerBand:

    if score >= 70:
        return PeerBand(label="strong", min_score=70, max_score=100)

    if score >= 50:
        return PeerBand(label="average", min_score=50, max_score=69)

    if score >= 30:
        return PeerBand(label="below_average", min_score=30, max_score=49)

    return PeerBand(label="weak", min_score=0, max_score=29)


# --------------------------------------------------
# Peer Baselines (placeholder global medians)
# --------------------------------------------------

PEER_BASELINES = {

    "income_commitment_ratio": 0.15,

    "free_cashflow_commitment_ratio": 0.30,

    "term_length_months": 48,

}


# --------------------------------------------------
# Percentile Estimation
# --------------------------------------------------

def _estimate_percentile(user_value: float, peer_value: float) -> int:

    if peer_value == 0:
        return 50

    ratio = user_value / peer_value

    if ratio <= 0.5:
        return 10
    if ratio <= 0.75:
        return 30
    if ratio <= 1.0:
        return 50
    if ratio <= 1.25:
        return 70
    if ratio <= 1.5:
        return 85

    return 95


# --------------------------------------------------
# Interpretation
# --------------------------------------------------

def _interpret(metric: str, user: float, peer: float) -> str:

    if user < peer * 0.8:
        return "strong relative position"

    if user <= peer * 1.1:
        return "close to peer median"

    if user <= peer * 1.4:
        return "moderately above peer levels"

    return "significantly above peer levels"


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(score: int, band: str) -> str:

    if band == "strong":
        return (
            "Your financial structure appears stronger than most comparable peers. "
            "Commitments remain relatively conservative compared with typical households."
        )

    if band == "average":
        return (
            "Your financial structure is broadly aligned with typical peer households. "
            "Commitments fall within common ranges for similar income levels."
        )

    if band == "below_average":
        return (
            "Commitment levels appear somewhat higher than peer households. "
            "Improving flexibility or liquidity could strengthen financial positioning."
        )

    return (
        "Commitment levels appear significantly heavier than typical peers. "
        "This structure may reduce financial resilience relative to similar households."
    )


def _recommendations(score: int) -> list[str]:

    recs: list[str] = []

    if score < 40:

        recs.append(
            "Consider reducing recurring commitments to align more closely with peer benchmarks."
        )

        recs.append(
            "Improving savings buffers can help close resilience gaps relative to peers."
        )

    elif score < 60:

        recs.append(
            "Maintaining additional liquidity could strengthen financial positioning."
        )

    else:

        recs.append(
            "Your commitments appear well managed relative to peers."
        )

    return recs


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_peer_benchmark(
    req: CommitmentLockRequest,
) -> PeerBenchmarkResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()

    commitment = evaluate_commitment_lock(req)

    income_share = getattr(commitment, "income_share", None)

    free_cashflow_share = getattr(commitment, "free_cashflow_share", None)

    term = req.term_months


    metrics: List[PeerMetric] = []


    if income_share is not None:

        peer = PEER_BASELINES["income_commitment_ratio"]

        percentile = _estimate_percentile(income_share, peer)

        metrics.append(

            PeerMetric(
                metric="income_commitment_ratio",
                user_value=income_share,
                peer_median=peer,
                percentile=percentile,
                interpretation=_interpret("income_commitment_ratio", income_share, peer),
            )
        )


    if free_cashflow_share is not None:

        peer = PEER_BASELINES["free_cashflow_commitment_ratio"]

        percentile = _estimate_percentile(free_cashflow_share, peer)

        metrics.append(

            PeerMetric(
                metric="free_cashflow_commitment_ratio",
                user_value=free_cashflow_share,
                peer_median=peer,
                percentile=percentile,
                interpretation=_interpret(
                    "free_cashflow_commitment_ratio",
                    free_cashflow_share,
                    peer,
                ),
            )
        )


    peer_term = PEER_BASELINES["term_length_months"]

    percentile = _estimate_percentile(term, peer_term)

    metrics.append(

        PeerMetric(
            metric="term_length_months",
            user_value=float(term),
            peer_median=float(peer_term),
            percentile=percentile,
            interpretation=_interpret("term_length_months", term, peer_term),
        )
    )


    if metrics:

        avg_percentile = sum(m.percentile for m in metrics) / len(metrics)

    else:

        avg_percentile = 50


    score = _clamp(100 - avg_percentile)


    band = _band(score)

    summary = _summary(score, band.label)

    recs = _recommendations(score)


    processing_ms = int((time.perf_counter() - start) * 1000)


    return PeerBenchmarkResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        peer_score=score,

        peer_band=band,

        peer_metrics=metrics,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment
        },

        summary=summary,

        recommendations=recs,
    )