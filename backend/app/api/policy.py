from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engines.policy import validate_policy

router = APIRouter(
    prefix="/policy",
    tags=["Policy"]
)


class PolicyRequest(BaseModel):
    income: float
    expenses: float
    savings_rate: float


@router.post("/validate")
def validate(req: PolicyRequest):

    try:

        result = validate_policy(
            income=req.income,
            expenses=req.expenses,
            savings_rate=req.savings_rate
        )

        return {
            "status": "success",
            "result": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))