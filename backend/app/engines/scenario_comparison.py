from __future__ import annotations

import time
import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.commitment_lock import CommitmentLockRequest


ENGINE_VERSION = "scenario_comparison_engine_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class ScenarioResult(BaseModel):

    scenario: str
    monthly_payment: float
    score: float | None


class ScenarioComparisonResponse(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    best_scenario: str | None

    ranking: list[ScenarioResult]

    summary: str

    model_config = {"frozen": True}


# --------------------------------------------------
# Engine
# --------------------------------------------------

def compare_scenarios(
    req: CommitmentLockRequest,
) -> ScenarioComparisonResponse:

    # FIX: local import prevents circular dependency
    from app.engines.financial_state import evaluate_financial_state

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.utcnow()

    base_payment = float(req.monthly_payment)

    scenarios = {
        "buy": base_payment,
        "lease": base_payment * 0.6,
        "delay_purchase": 0,
    }

    results: list[ScenarioResult] = []

    for name, payment in scenarios.items():

        test_req = req.model_copy()

        test_req.monthly_payment = payment

        state = evaluate_financial_state(test_req)

        score = state.get("global_financial_score")

        results.append(
            ScenarioResult(
                scenario=name,
                monthly_payment=payment,
                score=score,
            )
        )

    ranked = sorted(
        results,
        key=lambda r: r.score if r.score is not None else -1,
        reverse=True,
    )

    best = ranked[0].scenario if ranked else None

    summary = (
        f"The scenario with the strongest financial outcome is '{best}'."
        if best
        else "Unable to determine best scenario."
    )

    processing_ms = int((time.perf_counter() - start) * 1000)

    return ScenarioComparisonResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        best_scenario=best,
        ranking=ranked,
        summary=summary,
    )