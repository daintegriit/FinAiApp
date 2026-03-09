from __future__ import annotations

import time
import uuid
import logging

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.schemas.commitment_lock import CommitmentLockRequest
from app.schemas.financial_analysis import FinancialAnalysisResponse

from app.engines.financial_explanation import evaluate_financial_explanation
from app.services.financial_orchestrator import FinancialOrchestrator

from app.db.session import get_db


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
    db: Session = Depends(get_db),
) -> FinancialAnalysisResponse:
    """
    Execute the complete Financial Intelligence Pipeline.

    Engines executed through the registry-driven orchestrator:

    • Policy Engine
    • Portfolio Engine
    • Commitment Lock Engine
    • Scenario Engine
    • Behavioral Drift Engine

    Returns a unified financial analysis including
    engine outputs, explanation, and processing metrics.
    """

    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:

        logger.info(
            "Financial analysis started",
            extra={"request_id": request_id},
        )

        # --------------------------------------------------
        # Run Financial Orchestrator (registry-driven)
        # --------------------------------------------------

        orchestration = await orchestrator.run(
            payload=request.model_dump(),
            db=db,
            request_id=request_id,
        )

        engines = orchestration.get("engines", {})
        engine_timings = orchestration.get("engine_timings", {})
        run_id = orchestration.get("run_id")

        # --------------------------------------------------
        # Extract Global Financial Score (from policy engine)
        # --------------------------------------------------

        policy_result = engines.get("policy", {})
        global_score = policy_result.get("global_financial_score")

        # --------------------------------------------------
        # Explanation Engine
        # --------------------------------------------------

        explanation = evaluate_financial_explanation(request)

        # --------------------------------------------------
        # Processing Time
        # --------------------------------------------------

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            "Financial analysis completed",
            extra={
                "request_id": request_id,
                "run_id": run_id,
                "runtime_ms": elapsed_ms,
            },
        )

        # --------------------------------------------------
        # Response
        # --------------------------------------------------

        return FinancialAnalysisResponse(
            status="success",

            request_id=request_id,
            run_id=run_id,

            global_financial_score=global_score,

            engines=engines,
            engine_timings=engine_timings,

            explanation=explanation,

            processing_ms=elapsed_ms,
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Financial analysis validation error",
            extra={"request_id": request_id, "error": str(e)},
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception(
            "Financial analysis engine failure",
            extra={"request_id": request_id},
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Financial analysis failed",
                "request_id": request_id,
                "message": str(e),
            },
        )