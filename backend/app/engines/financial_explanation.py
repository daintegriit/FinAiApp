from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.engines.financial_state import evaluate_financial_state
from app.schemas.commitment_lock import CommitmentLockRequest
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_explanation_engine_v3"


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
    category: Literal["risk_driver","strength","constraint","opportunity","recommendation"],
    title: str,
    detail: str,
    severity: Literal["low","medium","high"],
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

    engines = state.get("engines", {})

    commitment = engines.get("commitment_lock")
    volatility = engines.get("income_volatility")
    macro = engines.get("macro_sensitivity")
    peer = engines.get("peer_benchmark")
    trajectory = engines.get("peer_trajectory")
    impact = engines.get("global_impact")
    resilience = engines.get("financial_resilience")
    optionality = engines.get("financial_optionality")
    identity = engines.get("financial_identity")
    drift = engines.get("behavioral_drift")

    portfolio = engines.get("portfolio_growth")
    shock = engines.get("shock_simulator")
    decision = engines.get("decision_delta")
    


    # --------------------------------------------------
    # Commitment Lock
    # --------------------------------------------------

    lock_score = _safe_get(commitment, "lock_score")
    income_share = _safe_get(commitment, "income_share")
    free_cashflow_share = _safe_get(commitment, "free_cashflow_share")

    if lock_score is not None and lock_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "High commitment rigidity",
            "Recurring obligations significantly reduce financial maneuverability.",
            "high",
        )

    if free_cashflow_share is not None and free_cashflow_share >= 0.8:
        _add_finding(
            findings,
            "risk_driver",
            "Free cashflow heavily consumed",
            "Most discretionary income is committed to recurring obligations.",
            "high",
        )

    if income_share is not None and income_share < 0.1:
        _add_finding(
            findings,
            "strength",
            "Low income burden",
            "Commitments represent a small portion of income.",
            "low",
        )


    # --------------------------------------------------
    # Income Volatility
    # --------------------------------------------------

    volatility_score = _safe_get(volatility, "volatility_score")

    if volatility_score is not None and volatility_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "Income shock vulnerability",
            "Income instability could threaten sustainability of commitments.",
            "high",
        )


    # --------------------------------------------------
    # Macro Sensitivity
    # --------------------------------------------------

    macro_score = _safe_get(macro, "macro_sensitivity_score")

    if macro_score is not None and macro_score >= 70:
        _add_finding(
            findings,
            "risk_driver",
            "High macro sensitivity",
            "Financial structure exposed to inflation and economic stress.",
            "high",
        )


    # --------------------------------------------------
    # Peer Benchmark
    # --------------------------------------------------

    peer_score = _safe_get(peer, "peer_score")

    if peer_score is not None and peer_score < 40:
        _add_finding(
            findings,
            "constraint",
            "Below-peer financial positioning",
            "Commitment structure appears heavier than comparable households.",
            "medium",
        )


    # --------------------------------------------------
    # Peer Trajectory (NEW)
    # --------------------------------------------------

    trajectory_score = _safe_get(trajectory, "trajectory_score")
    gap20 = _safe_get(trajectory, "estimated_peer_gap_20y")
    gap30 = _safe_get(trajectory, "estimated_peer_gap_30y")

    if trajectory_score is not None and trajectory_score < 30 and gap30 is not None:
        
        _add_finding(
            findings,
            "risk_driver",
            "Long-term trajectory materially below peers",
            f"Projected wealth path may fall approximately {abs(gap30):,.0f} behind peers over 30 years.",
            "high",
        )

    elif trajectory_score is not None and trajectory_score >= 70 and gap30 is not None:

        _add_finding(
            findings,
            "strength",
            "Long-term trajectory ahead of peers",
            f"Projected wealth path exceeds peers by approximately {gap30:,.0f} over 30 years.",
            "low",
        )


    # --------------------------------------------------
    # Global Impact
    # --------------------------------------------------

    impact_score = _safe_get(impact, "impact_score")
    lifetime_cost = _safe_get(impact, "lifetime_opportunity_cost")

    if impact_score is not None and impact_score >= 70:

        _add_finding(
            findings,
            "risk_driver",
            "Large long-term wealth drag",
            "Commitment significantly reduces investment capacity.",
            "high",
        )

    elif lifetime_cost:

        _add_finding(
            findings,
            "opportunity",
            "Investment opportunity cost detected",
            f"Estimated lifetime opportunity cost ≈ {lifetime_cost:,.0f}.",
            "medium",
        )


    # --------------------------------------------------
    # Portfolio Growth
    # --------------------------------------------------

    portfolio_value = _safe_get(portfolio, "final_value")

    if portfolio_value is not None and portfolio_value >= 1_000_000:

        _add_finding(
            findings,
            "strength",
            "Strong long-term investment trajectory",
            f"Projected portfolio value ≈ {portfolio_value:,.0f}.",
            "low",
        )

    elif portfolio_value is not None and portfolio_value < 100_000:

        _add_finding(
            findings,
            "constraint",
            "Limited investment accumulation",
            "Investment contributions may be insufficient for long-term goals.",
            "medium",
        )

    
    # --------------------------------------------------
    # Decision Delta
    # --------------------------------------------------

    wealth_delta = _safe_get(decision, "wealth_delta")
    delta_band = _safe_get(decision, "delta_band")

    if wealth_delta is not None:

        if wealth_delta <= -250000:
            
            _add_finding(
                findings,
                "risk_driver",
                "Purchase materially reduces long-term wealth",
                f"This decision may reduce projected wealth by approximately {abs(wealth_delta):,.0f} over 30 years.",
                "high",
            )

        elif wealth_delta <= -50000:

            _add_finding(
                findings,
                "constraint",
                "Purchase reduces long-term wealth trajectory",
                f"Projected lifetime wealth impact ≈ {abs(wealth_delta):,.0f}.",
                "medium",
            )

        elif wealth_delta > 100000:

            _add_finding(
                findings,
                "opportunity",
                "Decision improves long-term wealth",
                f"Projected wealth increase ≈ {wealth_delta:,.0f} over 30 years.",
                "low",
            )


    # --------------------------------------------------
    # Shock Simulator
    # --------------------------------------------------

    shock_survival = _safe_get(shock, "survival_probability")

    if shock_survival is not None and shock_survival < 0.4:

        _add_finding(
            findings,
            "risk_driver",
            "Low financial shock survival probability",
            "Simulated economic shocks indicate elevated financial stress risk.",
            "high",
        )

    elif shock_survival is not None and shock_survival >= 0.75:

        _add_finding(
            findings,
            "strength",
            "High shock survival probability",
            "Financial structure appears resilient under simulated shocks.",
            "low",
        )


    # --------------------------------------------------
    # Financial Resilience
    # --------------------------------------------------

    resilience_score = _safe_get(resilience, "resilience_score")

    if resilience_score is not None and resilience_score < 40:

        _add_finding(
            findings,
            "risk_driver",
            "Low systemic resilience",
            "Combined indicators suggest limited shock absorption capacity.",
            "high",
        )


    # --------------------------------------------------
    # Financial Identity
    # --------------------------------------------------

    dominant_identity = _safe_get(identity, "dominant_identity")

    if dominant_identity:

        _add_finding(
            findings,
            "opportunity",
            "Financial identity detected",
            f"Profile resembles '{dominant_identity}' financial behavior pattern.",
            "low",
        )


    # --------------------------------------------------
    # Behavioral Drift
    # --------------------------------------------------

    drift_score = _safe_get(drift, "drift_score")

    if drift_score is not None and drift_score >= 70:

        _add_finding(
            findings,
            "risk_driver",
            "Behavioral drift detected",
            "Recent behavior trends indicate increasing commitment pressure.",
            "high",
        )


    # --------------------------------------------------
    # Default
    # --------------------------------------------------

    if not findings:

        _add_finding(
            findings,
            "strength",
            "No major risk drivers identified",
            "The engine stack did not detect dominant financial weaknesses.",
            "low",
        )

    return findings


# --------------------------------------------------
# Summaries
# --------------------------------------------------

def _build_executive_summary(score: Optional[float], band: Optional[str], findings):

    if score is None:
        return "Financial analysis completed but global score unavailable."

    top = [f.title for f in findings if f.severity == "high"][:3]

    return (
        f"Overall financial state score is {score:.2f}. "
        f"Primary drivers include: {', '.join(top) if top else 'no critical drivers'}."
    )


def _build_user_summary(score: Optional[float], band: Optional[str], findings):

    risks = [f.detail for f in findings if f.category == "risk_driver"][:2]
    strengths = [f.detail for f in findings if f.category == "strength"][:2]

    risk_text = "; ".join(risks) if risks else "No dominant risks detected."
    strength_text = "; ".join(strengths) if strengths else "Financial structure appears stable."

    if score is None:
        return f"{risk_text} {strength_text}"

    return (
        f"Financial score: {score:.2f}. "
        f"Key risks: {risk_text} "
        f"Strengths: {strength_text}"
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
        global_score,
        band.label if band else None,
        findings
    )

    user_summary = _build_user_summary(
        global_score,
        band.label if band else None,
        findings
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