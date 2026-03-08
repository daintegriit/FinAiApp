from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.engines.financial_state_engine import evaluate_financial_state
from app.schemas.commitment_lock import CommitmentLockRequest
from app.policy.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_explanation_engine_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class ExplanationFinding(BaseModel):
    category: Literal[
        "risk_driver",
        "strength",
        "constraint",
        "opportunity",
        "recommendation",
    ]
    title: str
    detail: str
    severity: Literal["low", "medium", "high"]

    model_config = {"frozen": True}


class ExplanationBand(BaseModel):
    label: Literal["healthy", "caution", "fragile", "critical"]
    min_score: int = Field(..., ge=0, le=100)
    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class FinancialExplanationResponse(BaseModel):
    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    global_financial_score: Optional[float] = None
    explanation_band: Optional[ExplanationBand] = None

    executive_summary: str
    user_summary: str

    findings: list[ExplanationFinding]

    policy_versions: dict[str, str]
    supporting_engines: dict[str, Any]

    llm_mode: Literal["disabled", "deterministic"] = "deterministic"

    model_config = {"frozen": True}


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def _safe_get(obj: Any, field: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(field, default)
    return getattr(obj, field, default)


def _score_band(score: Optional[float]) -> Optional[ExplanationBand]:
    if score is None:
        return None
    if score >= 70:
        return ExplanationBand(label="healthy", min_score=70, max_score=100)
    if score >= 50:
        return ExplanationBand(label="caution", min_score=50, max_score=69)
    if score >= 30:
        return ExplanationBand(label="fragile", min_score=30, max_score=49)
    return ExplanationBand(label="critical", min_score=0, max_score=29)


def _add_finding(
    findings: list[ExplanationFinding],
    category: Literal["risk_driver", "strength", "constraint", "opportunity", "recommendation"],
    title: str,
    detail: str,
    severity: Literal["low", "medium", "high"],
) -> None:
    findings.append(
        ExplanationFinding(
            category=category,
            title=title,
            detail=detail,
            severity=severity,
        )
    )


# --------------------------------------------------
# Rule-based explanation extraction
# --------------------------------------------------

def _extract_findings(state: dict[str, Any]) -> list[ExplanationFinding]:
    findings: list[ExplanationFinding] = []

    commitment = state.get("engines", {}).get("commitment_lock")
    volatility = state.get("engines", {}).get("income_volatility")
    macro = state.get("engines", {}).get("macro_sensitivity")
    peer = state.get("engines", {}).get("peer_benchmark")
    impact = state.get("engines", {}).get("global_impact")
    resilience = state.get("engines", {}).get("financial_resilience")
    optionality = state.get("engines", {}).get("financial_optionality")
    identity = state.get("engines", {}).get("financial_identity")
    drift = state.get("engines", {}).get("behavioral_drift")

    # Commitment
    lock_score = _safe_get(commitment, "lock_score")
    income_share = _safe_get(commitment, "income_share")
    free_cashflow_share = _safe_get(commitment, "free_cashflow_share")

    if lock_score is not None and lock_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "High commitment rigidity",
            "Current recurring obligations create a strong lock-in effect and reduce financial maneuverability.",
            "high",
        )
    elif lock_score is not None and lock_score >= 50:
        _add_finding(
            findings,
            "constraint",
            "Moderate commitment pressure",
            "Current obligations reduce flexibility and should be monitored before taking on additional fixed costs.",
            "medium",
        )

    if free_cashflow_share is not None and free_cashflow_share >= 0.8:
        _add_finding(
            findings,
            "risk_driver",
            "Free cashflow is heavily consumed",
            "The current commitment consumes most available discretionary cashflow, increasing fragility.",
            "high",
        )
    elif free_cashflow_share is not None and free_cashflow_share < 0.3:
        _add_finding(
            findings,
            "strength",
            "Strong discretionary buffer",
            "The commitment leaves a meaningful amount of discretionary cashflow available.",
            "low",
        )

    if income_share is not None and income_share < 0.1:
        _add_finding(
            findings,
            "strength",
            "Low income burden",
            "The commitment represents a relatively small share of monthly income.",
            "low",
        )

    # Volatility
    volatility_score = _safe_get(volatility, "volatility_score")
    if volatility_score is not None and volatility_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "Income shock vulnerability",
            "A moderate income disruption could materially strain the ability to sustain commitments.",
            "high",
        )
    elif volatility_score is not None and volatility_score < 30:
        _add_finding(
            findings,
            "strength",
            "Income resilience under stress",
            "The current structure appears relatively resilient under modeled income shock scenarios.",
            "low",
        )

    # Macro
    macro_score = _safe_get(macro, "macro_sensitivity_score")
    if macro_score is not None and macro_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "High macro sensitivity",
            "The current financial structure is highly exposed to inflation, recession, or cost-of-living pressure.",
            "high",
        )

    # Peer
    peer_score = _safe_get(peer, "peer_score")
    if peer_score is not None and peer_score < 40:
        _add_finding(
            findings,
            "constraint",
            "Below-peer financial positioning",
            "Current commitment structure appears heavier than peer benchmarks for similar households.",
            "medium",
        )
    elif peer_score is not None and peer_score >= 70:
        _add_finding(
            findings,
            "strength",
            "Strong peer-relative position",
            "Current obligations appear conservative relative to comparable peer households.",
            "low",
        )

    # Impact
    impact_score = _safe_get(impact, "impact_score")
    lifetime_cost = _safe_get(impact, "lifetime_opportunity_cost")
    if impact_score is not None and impact_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "Large long-term wealth drag",
            "The modeled commitment materially reduces long-term investment capacity and creates significant opportunity cost.",
            "high",
        )
    elif lifetime_cost is not None and lifetime_cost > 0:
        _add_finding(
            findings,
            "opportunity",
            "Investment tradeoff identified",
            f"The decision carries an estimated long-term opportunity cost of approximately {lifetime_cost:,.2f} in modeled future value.",
            "medium",
        )

    # Resilience
    resilience_score = _safe_get(resilience, "resilience_score")
    if resilience_score is not None and resilience_score < 40:
        _add_finding(
            findings,
            "risk_driver",
            "Low overall resilience",
            "Combined signals indicate reduced capacity to absorb financial shocks while maintaining current obligations.",
            "high",
        )
    elif resilience_score is not None and resilience_score >= 70:
        _add_finding(
            findings,
            "strength",
            "Strong overall resilience",
            "Combined signals suggest the current financial structure remains comparatively robust.",
            "low",
        )

    # Optionality
    optionality_score = _safe_get(optionality, "optionality_score")
    if optionality_score is not None and optionality_score < 40:
        _add_finding(
            findings,
            "constraint",
            "Reduced financial optionality",
            "The commitment structure may limit relocation, career pivots, and future financial choices.",
            "medium",
        )

    # Identity
    dominant_identity = _safe_get(identity, "dominant_identity")
    if dominant_identity:
        _add_finding(
            findings,
            "opportunity",
            "Financial identity detected",
            f"The current profile most closely aligns with the '{dominant_identity}' financial identity pattern.",
            "low",
        )

    # Drift
    drift_score = _safe_get(drift, "drift_score")
    if drift_score is not None and drift_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "Behavioral drift detected",
            "Recent movement in commitment pressure suggests worsening financial behavior trends over time.",
            "high",
        )
    elif drift_score is not None and drift_score < 25:
        _add_finding(
            findings,
            "strength",
            "Behavior stable or improving",
            "Current behavior signals suggest either stable or improving financial trajectory.",
            "low",
        )

    # General recommendations
    if lock_score is not None and lock_score >= 60:
        _add_finding(
            findings,
            "recommendation",
            "Avoid adding new fixed costs",
            "Delay additional recurring obligations until commitment rigidity improves.",
            "high",
        )

    if free_cashflow_share is not None and free_cashflow_share >= 0.8:
        _add_finding(
            findings,
            "recommendation",
            "Increase liquidity buffer",
            "Build or preserve discretionary cash reserves to reduce near-term fragility.",
            "high",
        )

    if impact_score is not None and impact_score >= 50:
        _add_finding(
            findings,
            "recommendation",
            "Compare against investment alternatives",
            "Evaluate whether the long-term value of the purchase justifies the modeled opportunity cost.",
            "medium",
        )

    if not findings:
        _add_finding(
            findings,
            "strength",
            "No major risk drivers identified",
            "The current engine stack did not detect a dominant financial weakness under present assumptions.",
            "low",
        )

    return findings


def _build_executive_summary(score: Optional[float], band: Optional[str], findings: list[ExplanationFinding]) -> str:
    if score is None:
        return (
            "The financial state engine completed with limited scoring visibility. "
            "Structured findings were generated, but an overall score was unavailable."
        )

    top_high = [f.title for f in findings if f.severity == "high"][:3]

    if band == "critical":
        return (
            f"Overall financial state is critical with a global score of {score:.2f}. "
            f"Primary issues include: {', '.join(top_high) if top_high else 'multiple high-severity constraints'}."
        )

    if band == "fragile":
        return (
            f"Overall financial state is fragile with a global score of {score:.2f}. "
            f"The system identified notable stress across commitments, flexibility, or resilience."
        )

    if band == "caution":
        return (
            f"Overall financial state requires caution with a global score of {score:.2f}. "
            f"There are manageable strengths, but also identifiable constraints that should be monitored."
        )

    return (
        f"Overall financial state appears healthy with a global score of {score:.2f}. "
        f"The current profile shows more strengths than material financial stressors."
    )


def _build_user_summary(score: Optional[float], band: Optional[str], findings: list[ExplanationFinding]) -> str:
    risk_drivers = [f for f in findings if f.category == "risk_driver"][:2]
    strengths = [f for f in findings if f.category == "strength"][:2]

    risk_text = "; ".join(f.detail for f in risk_drivers) if risk_drivers else "No dominant risk drivers were detected."
    strength_text = "; ".join(f.detail for f in strengths) if strengths else "The profile should continue to be monitored as more history becomes available."

    if score is None:
        return f"{risk_text} {strength_text}"

    return (
        f"Your current financial state score is {score:.2f}"
        + (f" ({band}). " if band else ". ")
        + f"Main risk picture: {risk_text} "
        + f"Main strengths: {strength_text}"
    )


# --------------------------------------------------
# Public engine
# --------------------------------------------------

def evaluate_financial_explanation(req: CommitmentLockRequest) -> FinancialExplanationResponse:
    start = time.perf_counter()

    request_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    policy_versions = get_policy_versions()
    state = evaluate_financial_state(req)

    global_score = state.get("global_financial_score")
    band = _score_band(global_score)

    findings = _extract_findings(state)

    executive_summary = _build_executive_summary(
        score=global_score,
        band=band.label if band else None,
        findings=findings,
    )

    user_summary = _build_user_summary(
        score=global_score,
        band=band.label if band else None,
        findings=findings,
    )

    processing_ms = int((time.perf_counter() - start) * 1000)

    return FinancialExplanationResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        global_financial_score=global_score,
        explanation_band=band,
        executive_summary=executive_summary,
        user_summary=user_summary,
        findings=findings,
        policy_versions=policy_versions,
        supporting_engines=state,
        llm_mode="deterministic",
    )