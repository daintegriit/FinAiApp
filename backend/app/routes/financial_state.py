from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends

from app.engines.financial_state import evaluate_financial_state
from app.schemas.commitment_lock import CommitmentLockRequest
from app.schemas.financial_state import FinancialStateResponse

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/financial-state",
    tags=["Financial State"],
)


# --------------------------------------------------
# Financial State Evaluation
# --------------------------------------------------

@router.post(
    "/evaluate",
    response_model=FinancialStateResponse,
    summary="Evaluate user's financial state",
)
def financial_state(
    req: CommitmentLockRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> FinancialStateResponse:
    """
    Evaluate the user's financial state based on income,
    expenses, commitments, and behavioral indicators.

    This engine computes a global financial health score
    along with individual engine metrics.
    """

    start = time.perf_counter()

    try:

        logger.info("Financial state evaluation started")

        # --------------------------------------------------
        # Engine Execution
        # --------------------------------------------------

        result = evaluate_financial_state(req)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Financial state evaluation completed in %sms",
            elapsed_ms
        )

        return FinancialStateResponse(
            status="success",
            processing_ms=elapsed_ms,
            result=result
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Financial state validation error: %s",
            str(e)
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception("Financial state engine failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Financial state evaluation failed",
                "message": str(e)
            }
        )