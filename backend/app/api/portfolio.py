from fastapi import APIRouter, HTTPException

from app.schemas.portfolio import PortfolioRequest
from app.engines.portfolio_growth import (
    PortfolioAssumptions,
    evaluate_portfolio_growth,
)

router = APIRouter(
    prefix="/portfolio",
    tags=["portfolio"]
)


@router.post("/growth")
def portfolio_growth(req: PortfolioRequest):

    try:

        assumptions = PortfolioAssumptions(
            monthly_contribution=req.monthly_contribution,
            years=req.years,
            annual_return=req.annual_return,
            volatility=req.volatility,
            simulations=req.simulations,
        )

        result = evaluate_portfolio_growth(assumptions)

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Portfolio simulation failed: {str(e)}"
        )