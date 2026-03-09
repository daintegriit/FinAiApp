from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engines.portfolio_growth import simulate_portfolio_growth

router = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio"]
)


class PortfolioRequest(BaseModel):
    monthly_contribution: float
    years: int
    annual_return: float = 0.07


@router.post("/growth")
def portfolio_growth(req: PortfolioRequest):

    try:

        result = simulate_portfolio_growth(
            monthly_contribution=req.monthly_contribution,
            years=req.years,
            annual_return=req.annual_return
        )

        return {
            "status": "success",
            "result": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))