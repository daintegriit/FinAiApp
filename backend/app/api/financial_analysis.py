from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.financial_explanation import evaluate_financial_explanation
from app.engines.financial_state import evaluate_financial_state


router = APIRouter(
    prefix="/financial",
    tags=["financial_ai"]
)


@router.post("/analyze")
def analyze_financial_state(request: CommitmentLockRequest):

    try:

        # Run raw engine system
        state = evaluate_financial_state(request)

        # Run explanation layer
        explanation = evaluate_financial_explanation(request)

        return {
            "global_financial_score": state.get("global_financial_score"),
            "processing_ms": state.get("processing_ms"),
            "engines": state.get("engines"),
            "explanation": explanation
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Financial analysis failed: {str(e)}"
        )