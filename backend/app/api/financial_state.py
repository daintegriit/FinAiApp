from __future__ import annotations

import time
from fastapi import APIRouter, HTTPException

from app.engines.financial_state import evaluate_financial_state
from app.schemas.commitment_lock import CommitmentLockRequest


router = APIRouter(
    prefix="/financial-state",
    tags=["financial_state"]
)


@router.post("/evaluate")
def financial_state(req: CommitmentLockRequest):

    start = time.perf_counter()

    try:

        result = evaluate_financial_state(req)

        elapsed = (time.perf_counter() - start) * 1000

        return {
            "status": "success",
            "processing_ms": round(elapsed, 2),
            "result": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Financial state evaluation failed",
                "message": str(e)
            }
        )