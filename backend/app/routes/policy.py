from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from app.engines.policy import validate_policy

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/policy",
    tags=["Policy Engine"],
)


# --------------------------------------------------
# Request / Response Schemas
# --------------------------------------------------

class PolicyRequest(BaseModel):

    income: float
    expenses: float
    savings_rate: float


class PolicyResponse(BaseModel):

    status: str
    processing_ms: float
    result: dict


# --------------------------------------------------
# Policy Validation
# --------------------------------------------------

@router.post(
    "/validate",
    response_model=PolicyResponse,
    summary="Validate financial policy compliance",
)
def validate(
    req: PolicyRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> PolicyResponse:
    """
    Validate a user's financial state against policy rules.

    Example policies:
    • Minimum savings rate
    • Expense-to-income thresholds
    • Budget safety rules

    Returns policy compliance results.
    """

    start = time.perf_counter()

    try:

        logger.info("Policy validation started")

        # --------------------------------------------------
        # Engine Execution
        # --------------------------------------------------

        result = validate_policy(
            income=req.income,
            expenses=req.expenses,
            savings_rate=req.savings_rate,
        )

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Policy validation completed in %sms",
            elapsed_ms
        )

        return PolicyResponse(
            status="success",
            processing_ms=elapsed_ms,
            result=result,
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Policy validation error: %s",
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

        logger.exception("Policy engine failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Policy validation failed",
                "message": str(e),
            },
        )