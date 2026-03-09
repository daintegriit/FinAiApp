from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_identity_v1"


# --------------------------------------------------
# Identity Types
# --------------------------------------------------

IdentityType = Literal[
    "wealth_builder",
    "stability_seeker",
    "flexibility_first",
    "lifestyle_maximizer",
    "risk_tolerant",
]


# --------------------------------------------------
# Models
# --------------------------------------------------

class IdentitySignal(BaseModel):

    signal: str

    value: float

    interpretation: str

    model_config = {"frozen": True}


class IdentityAlignment(BaseModel):

    identity: IdentityType

    alignment_score: int = Field(..., ge=0, le=100)

    interpretation: str

    model_config = {"frozen": True}


class FinancialIdentityResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    dominant_identity: IdentityType

    identity_alignments: List[IdentityAlignment]

    signals: List[IdentitySignal]

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


# --------------------------------------------------
# Identity Evaluation
# --------------------------------------------------

def _score_wealth_builder(income_share: float, term: int):

    score = 100

    score -= income_share * 200

    if term > 60:
        score -= 20

    return _clamp(score)


def _score_stability(income_share: float, term: int):

    score = 70

    if income_share < 0.20:
        score += 20

    if term <= 60:
        score += 10

    return _clamp(score)


def _score_flexibility(income_share: float, term: int):

    score = 100

    score -= income_share * 220

    if term > 48:
        score -= 25

    return _clamp(score)


def _score_lifestyle(income_share: float, term: int):

    score = 50

    if income_share > 0.20:
        score += 25

    if term > 48:
        score += 10

    return _clamp(score)


def _score_risk_tolerant(income_share: float, term: int):

    score = 60

    if income_share > 0.25:
        score += 20

    if term > 60:
        score += 20

    return _clamp(score)


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(identity: str):

    if identity == "wealth_builder":

        return (
            "Your financial profile suggests a long-term wealth accumulation mindset. "
            "Decisions tend to favor investment capacity and long-term financial growth."
        )

    if identity == "stability_seeker":

        return (
            "Your financial behavior indicates a preference for predictable cashflow "
            "and stable financial commitments."
        )

    if identity == "flexibility_first":

        return (
            "Your financial behavior prioritizes flexibility and optionality, "
            "favoring lower recurring commitments."
        )

    if identity == "lifestyle_maximizer":

        return (
            "Your financial profile suggests prioritization of current lifestyle "
            "and consumption over long-term accumulation."
        )

    return (
        "Your financial behavior indicates tolerance for risk and willingness "
        "to accept volatility in pursuit of potential upside."
    )


def _recommendations(identity: str):

    recs: List[str] = []

    if identity == "wealth_builder":

        recs.append(
            "Maintaining low commitment ratios preserves capital for investment growth."
        )

    if identity == "flexibility_first":

        recs.append(
            "Avoid long-term fixed commitments that reduce financial mobility."
        )

    if identity == "lifestyle_maximizer":

        recs.append(
            "Balancing consumption with investment contributions can improve long-term outcomes."
        )

    if identity == "stability_seeker":

        recs.append(
            "Maintaining predictable payment structures aligns with stability-focused planning."
        )

    return recs


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_financial_identity(
    req: CommitmentLockRequest,
) -> FinancialIdentityResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    policy_versions = get_policy_versions()

    commitment = evaluate_commitment_lock(req)

    income_share = getattr(commitment, "income_share", 0.0) or 0.0

    term = req.term_months


    signals = [

        IdentitySignal(
            signal="income_commitment_ratio",
            value=income_share,
            interpretation="share of income allocated to commitments",
        ),

        IdentitySignal(
            signal="commitment_term_months",
            value=float(term),
            interpretation="length of commitment horizon",
        ),
    ]


    alignments = [

        IdentityAlignment(
            identity="wealth_builder",
            alignment_score=_score_wealth_builder(income_share, term),
            interpretation="alignment with long-term wealth accumulation",
        ),

        IdentityAlignment(
            identity="stability_seeker",
            alignment_score=_score_stability(income_share, term),
            interpretation="alignment with stable financial planning",
        ),

        IdentityAlignment(
            identity="flexibility_first",
            alignment_score=_score_flexibility(income_share, term),
            interpretation="alignment with financial flexibility",
        ),

        IdentityAlignment(
            identity="lifestyle_maximizer",
            alignment_score=_score_lifestyle(income_share, term),
            interpretation="alignment with consumption-focused financial behavior",
        ),

        IdentityAlignment(
            identity="risk_tolerant",
            alignment_score=_score_risk_tolerant(income_share, term),
            interpretation="alignment with risk tolerance",
        ),
    ]


    dominant = max(alignments, key=lambda x: x.alignment_score).identity


    summary = _summary(dominant)

    recs = _recommendations(dominant)


    processing_ms = int((time.perf_counter() - start) * 1000)


    return FinancialIdentityResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        dominant_identity=dominant,

        identity_alignments=alignments,

        signals=signals,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment
        },

        summary=summary,

        recommendations=recs,
    )