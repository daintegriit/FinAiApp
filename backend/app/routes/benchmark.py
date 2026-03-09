from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, Depends, status

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.peer_benchmark import (
    evaluate_peer_benchmark,
    PeerBenchmarkResponse,
)

# Optional future DB dependency
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/benchmark",
    tags=["Peer Benchmark"],
)


# --------------------------------------------------
# Peer Benchmark Evaluation
# --------------------------------------------------

@router.post(
    "/evaluate",
    response_model=PeerBenchmarkResponse,
    summary="Evaluate financial commitment against peer benchmarks",
)
def evaluate(
    req: CommitmentLockRequest,
    # db: Session = Depends(get_db),  # optional future extension
):
    """
    Evaluate a user's financial commitment against peer benchmark data.

    This route feeds the CommitmentLockRequest into the benchmarking engine,
    which compares the user's scenario against peer financial distributions.

    Returns structured benchmark analytics including percentile ranking,
    deviation from peers, and behavioral classification.
    """

    start = time.time()

    try:

        logger.info("Peer benchmark evaluation started")

        # --------------------------------------------------
        # Engine Execution
        # --------------------------------------------------

        result = evaluate_peer_benchmark(req)

        duration = round(time.time() - start, 4)

        logger.info(
            "Peer benchmark completed in %s seconds",
            duration
        )

        return result

    except ValueError as e:

        logger.warning(
            "Peer benchmark validation error: %s",
            str(e)
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        logger.exception("Peer benchmark execution failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Peer benchmark engine failure",
        )