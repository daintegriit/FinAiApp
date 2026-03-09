from __future__ import annotations

import time
from fastapi import APIRouter, HTTPException

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.financial_state import evaluate_financial_state
from app.engines.financial_explanation import evaluate_financial_explanation


router = APIRouter(
    prefix="/financial",
    tags=["financial_ai"]
)


@router.post("/analyze")
def analyze_financial_state(request: CommitmentLockRequest):

    start_time = time.perf_counter()

    try:

        # ------------------------------
        # Core financial engine system
        # ------------------------------
        state = evaluate_financial_state(request)

        # ------------------------------
        # Explanation layer
        # ------------------------------
        explanation = evaluate_financial_explanation(request)

        elapsed = (time.perf_counter() - start_time) * 1000

        return {
            "status": "success",
            "global_financial_score": state.get("global_financial_score"),
            "processing_ms": round(elapsed, 2),
            "engines": state.get("engines"),
            "explanation": explanation
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Financial analysis failed",
                "message": str(e)
            }
        )