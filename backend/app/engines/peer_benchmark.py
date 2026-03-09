from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.peer_distribution import evaluate_peer_distribution
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "peer_benchmark_v2"


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

    income = getattr(req.context, "gross_annual_income", None)

    metrics: List[PeerMetric] = []


    # --------------------------------------------------
    # Run Peer Distribution Engine
    # --------------------------------------------------

    distribution = evaluate_peer_distribution(

        income=income or 75000,

        housing_ratio=income_share or 0.0,

        car_payment_ratio=income_share or 0.0,

        commitment_ratio=income_share or 0.0,

        savings_rate=(1 - free_cashflow_share) if free_cashflow_share else 0.1
    )


    percentiles = distribution["percentiles"]

    medians = distribution["peer_medians"]


    # --------------------------------------------------
    # Income Commitment Ratio
    # --------------------------------------------------

    if income_share is not None:

        p = int(percentiles["commitment_ratio"])

        peer = medians["commitment_ratio"]

        metrics.append(

            PeerMetric(
                metric="income_commitment_ratio",
                user_value=income_share,
                peer_median=peer,
                percentile=p,
                interpretation=_interpret("income_commitment_ratio", income_share, peer),
            )
        )


    # --------------------------------------------------
    # Free Cashflow Commitment Ratio
    # --------------------------------------------------

    if free_cashflow_share is not None:

        peer = medians["savings_rate"]

        p = int(percentiles["savings_rate"])

        metrics.append(

            PeerMetric(
                metric="free_cashflow_commitment_ratio",
                user_value=free_cashflow_share,
                peer_median=peer,
                percentile=p,
                interpretation=_interpret(
                    "free_cashflow_commitment_ratio",
                    free_cashflow_share,
                    peer,
                ),
            )
        )


    # --------------------------------------------------
    # Term Length Benchmark
    # --------------------------------------------------

    peer_term = 48

    ratio = term / peer_term

    if ratio <= 0.75:
        percentile = 30
    elif ratio <= 1.0:
        percentile = 50
    elif ratio <= 1.25:
        percentile = 70
    else:
        percentile = 85

    metrics.append(

        PeerMetric(
            metric="term_length_months",
            user_value=float(term),
            peer_median=float(peer_term),
            percentile=percentile,
            interpretation=_interpret("term_length_months", term, peer_term),
        )
    )


    # --------------------------------------------------
    # Score
    # --------------------------------------------------

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
            "commitment_lock": commitment,
            "peer_distribution": distribution
        },

        summary=summary,

        recommendations=recs,
    )