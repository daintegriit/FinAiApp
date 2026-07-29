
import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends

from app.schemas.commitment_lock import (
    CommitmentLockRequest,
    CommitmentLockResponse,
)

from app.engines.commitment_lock import evaluate_commitment_lock

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/commitment-lock",
    tags=["Commitment Lock Engine"],
)


# --------------------------------------------------
# Commitment Lock Evaluation
# --------------------------------------------------

@router.post(
    "/evaluate",
    response_model=CommitmentLockResponse,
    summary="Evaluate financial commitment lock scenario",
)
def evaluate(
    req: CommitmentLockRequest,
    # db: Session = Depends(get_db),
    # user = Depends(get_current_user)
) -> CommitmentLockResponse:
    """
    Run the Commitment Lock financial simulation engine.

    This evaluates whether a user can safely commit to a recurring
    financial obligation based on income stability, obligations,
    and financial safety thresholds.

    Returns a structured risk evaluation.
    """

    start = time.perf_counter()

    try:

        logger.info("Commitment lock evaluation started")

        # --------------------------------------------------
        # Engine Execution
        # --------------------------------------------------

        result = evaluate_commitment_lock(req)

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # Attach runtime metadata if schema supports it
        if hasattr(result, "processing_ms"):
            result.processing_ms = elapsed_ms

        logger.info(
            "Commitment lock completed in %sms",
            elapsed_ms
        )

        return result

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Commitment lock validation error: %s",
            str(e)
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception("Commitment lock engine failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Commitment lock evaluation failed",
                "message": str(e),
            },
        )