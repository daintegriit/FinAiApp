from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from typing import List

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.financial_state import evaluate_financial_state
from app.engines.engine_registry import register_engine


ENGINE_VERSION = "scenario_engine_v1"


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

        if f["category"] in ["risk_driver", "constraint"]:
            risks.append(f["title"])

        if f["category"] == "strength":
            strengths.append(f["title"])

    return risks, strengths


# --------------------------------------------------
# Scenario Engine
# --------------------------------------------------

@register_engine("scenarios")
def evaluate_scenarios(
    scenarios: List[ScenarioInput],
) -> ScenarioEngineResponse:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    results: List[ScenarioResult] = []

    score_map = {}

    for s in scenarios:

        req = CommitmentLockRequest(
            monthly_payment=s.monthly_payment,
            term_months=s.term_months,
            net_monthly_income=s.net_monthly_income,
            current_free_cashflow=s.current_free_cashflow,
            currency=s.currency,
        )

        state = evaluate_financial_state(req)

        risks, strengths = _extract_findings(state.findings)

        result = ScenarioResult(
            name=s.name,
            global_financial_score=state.global_financial_score,
            explanation_band=state.explanation_band.label,
            key_risks=risks[:3],
            key_strengths=strengths[:3],
        )

        results.append(result)

        score_map[s.name] = state.global_financial_score

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