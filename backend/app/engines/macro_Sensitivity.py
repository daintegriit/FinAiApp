from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.policy_registry import get_policy_versions
from app.policy.global_assumptions import get_global_assumptions


ENGINE_VERSION = "macro_sensitivity_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class MacroScenario(BaseModel):

    name: str

    inflation_increase: float = Field(..., ge=0)

    income_change: float = Field(...)

    resulting_income: float

    commitment_share: float

    stress_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class MacroBand(BaseModel):

    label: Literal["resilient", "exposed", "sensitive", "highly_sensitive"]

    min_score: int = Field(..., ge=0, le=100)

    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class MacroSensitivityResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    macro_sensitivity_score: int = Field(..., ge=0, le=100)

    macro_band: MacroBand

    macro_confidence: Literal["low", "medium", "high"]

    macro_scenarios: List[MacroScenario]

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


def _safe_get(obj: object, field: str, default=None):

    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(field, default)

    return getattr(obj, field, default)


def _band(score: int) -> MacroBand:

    if score < 30:
        return MacroBand(label="resilient", min_score=0, max_score=29)

    if score < 55:
        return MacroBand(label="exposed", min_score=30, max_score=54)

    if score < 75:
        return MacroBand(label="sensitive", min_score=55, max_score=74)

    return MacroBand(label="highly_sensitive", min_score=75, max_score=100)


# --------------------------------------------------
# Scenario Simulation
# --------------------------------------------------

def _simulate_macro(
    name: str,
    inflation_increase: float,
    income_change: float,
    base_income: float,
    monthly_payment: float,
) -> MacroScenario:

    resulting_income = base_income * (1 + income_change)

    if resulting_income <= 0:
        commitment_share = 1.0
    else:
        commitment_share = monthly_payment / resulting_income

    stress_score = _clamp(commitment_share * 130)

    return MacroScenario(
        name=name,
        inflation_increase=inflation_increase,
        income_change=income_change,
        resulting_income=resulting_income,
        commitment_share=commitment_share,
        stress_score=stress_score,
    )


# --------------------------------------------------
# Summary
# --------------------------------------------------

def _summary(score: int, band: str) -> str:

    if band == "resilient":
        return (
            "The financial commitment appears resilient under typical macroeconomic "
            "fluctuations including inflation increases and moderate income shocks."
        )

    if band == "exposed":
        return (
            "Macroeconomic changes such as inflation or slower income growth "
            "could meaningfully affect the sustainability of the commitment."
        )

    if band == "sensitive":
        return (
            "The financial structure shows sensitivity to macroeconomic conditions. "
            "Economic downturns or rising living costs could create financial strain."
        )

    return (
        "The commitment is highly sensitive to macroeconomic shocks. "
        "Economic downturns, inflation spikes, or reduced income could significantly "
        "impact sustainability."
    )


def _recommendations(score: int) -> list[str]:

    recs: list[str] = []

    if score >= 70:

        recs.append(
            "Consider reducing long-term fixed commitments to protect against macroeconomic uncertainty."
        )

        recs.append(
            "Build a larger emergency fund to hedge against inflation and income shocks."
        )

    elif score >= 50:

        recs.append(
            "Monitor macroeconomic indicators such as inflation and interest rates when making new commitments."
        )

    else:

        recs.append(
            "Current commitments appear resilient under typical macroeconomic conditions."
        )

    return recs


# --------------------------------------------------
# Public Engine
# --------------------------------------------------

def evaluate_macro_sensitivity(
    req: CommitmentLockRequest,
) -> MacroSensitivityResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()

    commitment_result = evaluate_commitment_lock(req)

    monthly_income = req.net_monthly_income

    if monthly_income is None:
        monthly_income = 4000

    monthly_payment = req.monthly_payment

    # macro assumptions
    assumptions = get_global_assumptions(req.context.country if req.context else None)

    inflation = assumptions["inflation"]

    scenarios = [

        _simulate_macro(
            "inflation_spike",
            inflation_increase=inflation + 0.03,
            income_change=0.0,
            base_income=monthly_income,
            monthly_payment=monthly_payment,
        ),

        _simulate_macro(
            "recession",
            inflation_increase=inflation + 0.02,
            income_change=-0.15,
            base_income=monthly_income,
            monthly_payment=monthly_payment,
        ),

        _simulate_macro(
            "stagflation",
            inflation_increase=inflation + 0.05,
            income_change=-0.10,
            base_income=monthly_income,
            monthly_payment=monthly_payment,
        ),

        _simulate_macro(
            "economic_growth",
            inflation_increase=inflation,
            income_change=0.10,
            base_income=monthly_income,
            monthly_payment=monthly_payment,
        ),
    ]

    avg_stress = sum(s.stress_score for s in scenarios) / len(scenarios)

    macro_score = _clamp(avg_stress)

    band = _band(macro_score)

    confidence = "medium"

    summary = _summary(macro_score, band.label)

    recs = _recommendations(macro_score)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return MacroSensitivityResponse(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        macro_sensitivity_score=macro_score,

        macro_band=band,

        macro_confidence=confidence,

        macro_scenarios=scenarios,

        policy_versions=policy_versions,

        supporting_engines={
            "commitment_lock": commitment_result
        },

        summary=summary,

        recommendations=recs,
    )