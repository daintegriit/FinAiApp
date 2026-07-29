from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import List, Union

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.financial_state import evaluate_financial_state
from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.engine_registry import register_engine


ENGINE_VERSION = "scenario_engine_v6"


# --------------------------------------------------
# Scenario Input
# --------------------------------------------------

class ScenarioInput(BaseModel):
    name: str = Field(..., description="Scenario label")
    monthly_payment: float
    term_months: int
    net_monthly_income: float
    current_free_cashflow: float
    currency: str = "USD"

    model_config = {"frozen": True}


# --------------------------------------------------
# Scenario Result
# --------------------------------------------------

class ScenarioResult(BaseModel):
    name: str
    global_financial_score: float
    explanation_band: str
    key_risks: List[str]
    key_strengths: List[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Engine Response
# --------------------------------------------------

class ScenarioEngineResponse(BaseModel):
    schema_version: str = "1.0"
    engine_version: str
    request_id: str
    calculation_timestamp: datetime
    processing_ms: int
    scenario_results: List[ScenarioResult]
    best_scenario: str
    worst_scenario: str
    summary: str

    model_config = {"frozen": True}


# --------------------------------------------------
# Utilities
# --------------------------------------------------

def _extract_findings(findings):
    risks = []
    strengths = []

    for f in findings:
        status = f.get("status")
        message = f.get("message", "")

        if status in ["violation", "risk"]:
            risks.append(message)

        elif status in ["ok", "strength"]:
            strengths.append(message)

    return risks, strengths


def _to_float(x):
    try:
        return float(x) if x is not None else 0.0
    except Exception:
        return 0.0


def _safe_state(state):
    if isinstance(state, dict):
        return state

    return {
        "global_financial_score": getattr(state, "global_financial_score", 0),
        "explanation_band": getattr(state, "explanation_band", "unknown"),
        "findings": getattr(state, "findings", []),
        "supporting_engines": getattr(state, "supporting_engines", {}),
    }


# --------------------------------------------------
# Band Mapping (CRITICAL)
# --------------------------------------------------

def _map_score_to_band(score: float) -> str:

    # Higher score = healthier financial condition

    if score < 25:
        return "concerning_drift"

    if score < 45:
        return "early_drift"

    if score < 70:
        return "stable"

    return "improving"


VALID_BANDS = {
    "improving",
    "stable",
    "early_drift",
    "concerning_drift",
}


# --------------------------------------------------
# Scenario Engine
# --------------------------------------------------

@register_engine("scenarios")
def evaluate_scenarios(
    input_data: Union[CommitmentLockRequest, List[ScenarioInput], dict]
) -> ScenarioEngineResponse:

    start = time.perf_counter()
    request_id = str(uuid.uuid4())
    timestamp = datetime.now(UTC)

    # --------------------------------------------------
    # Normalize input
    # --------------------------------------------------

    if isinstance(input_data, list):
        scenarios = [
            s if isinstance(s, ScenarioInput)
            else ScenarioInput(**s)
            for s in input_data
        ]

    else:
        try:
            if isinstance(input_data, dict):
                req = CommitmentLockRequest(**input_data)
            else:
                req = input_data
        except Exception:
            raise ValueError("Invalid input for scenario engine")

        monthly_payment = _to_float(req.monthly_payment)
        net_income = _to_float(req.net_monthly_income)
        free_cashflow = _to_float(req.current_free_cashflow)

        scenarios = [
            ScenarioInput(
                name="Current Plan",
                monthly_payment=monthly_payment,
                term_months=req.term_months,
                net_monthly_income=net_income,
                current_free_cashflow=free_cashflow,
                currency=req.currency,
            ),
            ScenarioInput(
                name="Reduced Commitment",
                monthly_payment=monthly_payment * 0.75,
                term_months=req.term_months,
                net_monthly_income=net_income,
                current_free_cashflow=free_cashflow,
                currency=req.currency,
            ),
            ScenarioInput(
                name="Aggressive Paydown",
                monthly_payment=monthly_payment * 1.25,
                term_months=max(12, int(req.term_months * 0.75)),
                net_monthly_income=net_income,
                current_free_cashflow=free_cashflow,
                currency=req.currency,
            ),
        ]

    # --------------------------------------------------
    # Run scenarios
    # --------------------------------------------------

    results: List[ScenarioResult] = []
    score_map = {}

    for s in scenarios:

        # Preserve profile fields from original request
        base_req = input_data if isinstance(input_data, CommitmentLockRequest) else None

        scenario_req = CommitmentLockRequest(
            monthly_payment=_to_float(s.monthly_payment),
            term_months=s.term_months,
            net_monthly_income=_to_float(s.net_monthly_income),
            current_free_cashflow=_to_float(s.current_free_cashflow),
            currency=s.currency,
            # Preserve profile context
            age=getattr(base_req, "age", None),
            employment_type=getattr(base_req, "employment_type", None),
            risk_tolerance=getattr(base_req, "risk_tolerance", None),
            investment_experience=getattr(base_req, "investment_experience", None),
            savings_buffer=getattr(base_req, "savings_buffer", None),
            existing_debt=getattr(base_req, "existing_debt", None),
            lifestyle_priority=getattr(base_req, "lifestyle_priority", None),
            income_stability=getattr(base_req, "income_stability", None),
            financial_goal=getattr(base_req, "financial_goal", None),
            family_value=getattr(base_req, "family_value", None),
            personal_satisfaction=getattr(base_req, "personal_satisfaction", None),
            region=getattr(base_req, "region", "US"),
        )

        raw_state = evaluate_financial_state(scenario_req)
        state = _safe_state(raw_state)

        findings = state.get("findings", [])
        risks, strengths = _extract_findings(findings)

        # --------------------------------------------------
        # 🔥 ADD COMMITMENT LOCK RISKS
        # --------------------------------------------------

        commitment = state.get("supporting_engines", {}).get("commitment_lock")

        # Fallback: call commitment engine directly if financial_state
        # did not supply it or supplied an incomplete shape.
        if not commitment:
            direct_commitment = evaluate_commitment_lock(scenario_req)

            if isinstance(direct_commitment, dict):
                commitment = direct_commitment
            else:
                commitment = {
                    "reasons": [
                        {
                            "severity": getattr(r, "severity", None),
                            "message": getattr(r, "message", ""),
                        }
                        for r in getattr(direct_commitment, "reasons", [])
                    ]
                }

        if commitment:
            reasons = commitment.get("reasons", [])
            for r in reasons:
                if r.get("severity") in ["high", "critical"]:
                    risks.append(r.get("message"))

        # --------------------------------------------------
        # 🔥 SCORE + BAND FIX
        # --------------------------------------------------

        raw_explanation = state.get("explanation_band")

        if isinstance(raw_explanation, dict):
            raw_explanation = raw_explanation.get("label")

        score = float(state.get("global_financial_score", 0))
        computed_band = _map_score_to_band(score)

        if raw_explanation in VALID_BANDS:
            explanation = raw_explanation
        else:
            explanation = computed_band

        # --------------------------------------------------
        # 🔥 ADD HEURISTIC INSIGHTS
        # --------------------------------------------------

        if score > 60:
            strengths.append("Strong overall financial positioning")

        elif score > 40:
            strengths.append("Moderate financial stability")

        if score < 30:
            risks.append("Overall financial health is weak")

        # --------------------------------------------------
        # CLEANUP
        # --------------------------------------------------

        risks = [r for r in dict.fromkeys(risks) if r][:3]
        strengths = [s for s in dict.fromkeys(strengths) if s][:3]

        # --------------------------------------------------
        # Build result
        # --------------------------------------------------

        result = ScenarioResult(
            name=s.name,
            global_financial_score=score,
            explanation_band=explanation,
            key_risks=risks,
            key_strengths=strengths,
        )

        results.append(result)
        score_map[s.name] = score

    # --------------------------------------------------
    # Best / Worst
    # --------------------------------------------------

    best = max(score_map, key=score_map.get)
    worst = min(score_map, key=score_map.get)

    summary = (
        f"The scenario '{best}' produces the strongest financial position "
        f"while '{worst}' introduces the highest financial pressure."
    )

    processing_ms = int((time.perf_counter() - start) * 1000)

    return ScenarioEngineResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        scenario_results=results,
        best_scenario=best,
        worst_scenario=worst,
        summary=summary,
    )