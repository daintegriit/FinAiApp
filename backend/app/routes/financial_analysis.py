from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.commitment_lock import CommitmentLockRequest
from app.schemas.financial_analysis import FinancialAnalysisResponse

from app.engines.financial_explanation import evaluate_financial_explanation
from app.services.financial_orchestrator import FinancialOrchestrator


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/financial",
    tags=["Financial AI"],
)

# Reusable orchestrator instance
orchestrator = FinancialOrchestrator()


# --------------------------------------------------
# Financial Analysis
# --------------------------------------------------

@router.post(
    "/analyze",
    response_model=FinancialAnalysisResponse,
    summary="Run full financial intelligence analysis",
)
async def analyze_financial_state(
    request: CommitmentLockRequest,
) -> FinancialAnalysisResponse:
    """
    Run the complete financial intelligence pipeline.

    This endpoint orchestrates multiple financial engines:

    • Policy Engine
    • Portfolio Engine
    • Commitment Lock Engine
    • Scenario Engine

    The result is a unified financial score and explanation
    describing the user's financial health.
    """

    start_time = time.perf_counter()

    try:

        logger.info("Financial analysis started")

        # --------------------------------------------------
        # Run Financial Orchestrator
        # --------------------------------------------------

        orchestration = await orchestrator.run(request.dict())

        engines = orchestration.get("engines", {})

        # --------------------------------------------------
        # Explanation / Interpretation Engine
        # --------------------------------------------------

        explanation = evaluate_financial_explanation(request)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            "Financial analysis completed in %sms",
            elapsed_ms
        )

        return FinancialAnalysisResponse(
            status="success",

            global_financial_score=engines
            .get("policy", {})
            .get("global_financial_score"),

            engines=engines,

            explanation=explanation,

            processing_ms=elapsed_ms,
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Financial analysis validation error: %s",
            str(e),
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception("Financial analysis engine failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Financial analysis failed",
                "message": str(e),
            },
        )