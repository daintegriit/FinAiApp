from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends

from app.schemas.portfolio import PortfolioRequest, PortfolioResponse

from app.engines.portfolio_growth import (
    PortfolioAssumptions,
    evaluate_portfolio_growth,
)

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio Engine"],
)


# --------------------------------------------------
# Portfolio Growth Simulation
# --------------------------------------------------

@router.post(
    "/growth",
    response_model=PortfolioResponse,
    summary="Run portfolio growth simulation",
)
def portfolio_growth(
    req: PortfolioRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> PortfolioResponse:
    """
    Simulate long-term portfolio growth using Monte Carlo or
    deterministic financial modeling.

    Inputs:
    • monthly contribution
    • investment horizon
    • expected return
    • volatility
    • number of simulations

    Returns projected portfolio growth metrics.
    """

    start = time.perf_counter()

    try:

        logger.info("Portfolio growth simulation started")

        # --------------------------------------------------
        # Build simulation assumptions
        # --------------------------------------------------

        assumptions = PortfolioAssumptions(
            monthly_contribution=req.monthly_contribution,
            years=req.years,
            annual_return=req.annual_return,
            volatility=req.volatility,
            simulations=req.simulations,
        )

        # --------------------------------------------------
        # Execute simulation engine
        # --------------------------------------------------

        result = evaluate_portfolio_growth(assumptions)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Portfolio simulation completed in %sms",
            elapsed_ms
        )

        return PortfolioResponse(
            status="success",
            processing_ms=elapsed_ms,
            result=result
        )

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Portfolio validation error: %s",
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

        logger.exception("Portfolio simulation failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Portfolio simulation failed",
                "message": str(e),
            },
        )