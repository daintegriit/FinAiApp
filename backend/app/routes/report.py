
import time
import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.report import ReportRequest, ReportResponse
from app.services.financial_orchestrator import FinancialOrchestrator


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/report",
    tags=["Financial Reports"],
)

# Shared orchestrator instance
orchestrator = FinancialOrchestrator()


# --------------------------------------------------
# Generate Financial Report
# --------------------------------------------------

@router.post(
    "/generate",
    response_model=ReportResponse,
    summary="Generate full financial intelligence report",
)
async def generate_report(
    req: ReportRequest,
) -> ReportResponse:
    """
    Generate a complete financial intelligence report.

    Combines multiple engines:

    • Financial State Engine
    • Commitment Lock Engine
    • Portfolio Growth Engine
    • Policy Engine
    • Scenario Engine

    Returns a unified report used by dashboards or exports.
    """

    start = time.perf_counter()

    try:

        logger.info("Financial report generation started")

        # --------------------------------------------------
        # Run Financial Orchestrator
        # --------------------------------------------------

        orchestration = await orchestrator.run(req.dict())

        engines = orchestration.get("engines", {})
        engine_timings = orchestration.get("engine_timings", {})

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Financial report generated in %sms",
            elapsed_ms
        )

        return ReportResponse(
            status="success",

            processing_ms=elapsed_ms,

            report={
                "financial_state": engines.get("financial_state"),
                "commitment_lock": engines.get("commitment"),
                "portfolio_projection": engines.get("portfolio"),
                "policy": engines.get("policy"),
                "scenarios": engines.get("scenarios"),
            },

            engine_timings=engine_timings
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Report validation error: %s",
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

        logger.exception("Financial report generation failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Report generation failed",
                "message": str(e),
            },
        )