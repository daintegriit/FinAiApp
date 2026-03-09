from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC

from pydantic import BaseModel

from app.schemas.commitment_lock import CommitmentLockRequest


ENGINE_VERSION = "decision_optimizer_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class DecisionOptimizationResult(BaseModel):

    schema_version: str = "1.0"

    engine_version: str

    request_id: str

    calculation_timestamp: datetime

    processing_ms: int

    max_safe_payment: float

    score_at_limit: float

    tested_payments: int

    recommendation: str

    model_config = {"frozen": True}


# --------------------------------------------------
# Optimizer
# --------------------------------------------------

def optimize_payment_level(
    req: CommitmentLockRequest,
    score_threshold: float = 70,
    max_payment: int = 2000,
    step: int = 25,
) -> DecisionOptimizationResult:

    # Local import to avoid circular dependency
    from app.engines.financial_state import evaluate_financial_state

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    best_payment = 0
    best_score = 0

    tests = 0

    payment = step

    while payment <= max_payment:

        test_req = req.model_copy()

        test_req.monthly_payment = payment

        state = evaluate_financial_state(test_req)

        score = state.get("global_financial_score")

        tests += 1

        if score is None:
            break

        if score >= score_threshold:

            best_payment = payment
            best_score = score

        else:
            break

        payment += step

    processing_ms = int((time.perf_counter() - start) * 1000)

    if best_payment == 0:

        recommendation = (
            "Current financial conditions suggest avoiding new recurring commitments."
        )

    else:

        recommendation = (
            f"A monthly payment up to approximately ${best_payment:,.0f} "
            f"maintains a financial score above {score_threshold}."
        )

    return DecisionOptimizationResult(

        engine_version=ENGINE_VERSION,

        request_id=request_id,

        calculation_timestamp=timestamp,

        processing_ms=processing_ms,

        max_safe_payment=best_payment,

        score_at_limit=best_score,

        tested_payments=tests,

        recommendation=recommendation,
    )