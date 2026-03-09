from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException

from app.schemas.commitment_lock import (
    CommitmentLockRequest,
    CommitmentLockResponse,
)

from app.engines.commitment_lock import evaluate_commitment_lock


router = APIRouter(
    prefix="/commitment-lock",
    tags=["commitment_lock_engine"]
)


@router.post(
    "/evaluate",
    response_model=CommitmentLockResponse
)
def evaluate(req: CommitmentLockRequest) -> CommitmentLockResponse:

    start = time.perf_counter()

    try:

        result = evaluate_commitment_lock(req)

        # Optional: attach runtime metadata if your schema supports it
        if hasattr(result, "processing_ms"):
            result.processing_ms = int((time.perf_counter() - start) * 1000)

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Commitment lock evaluation failed",
                "message": str(e)
            }
        )