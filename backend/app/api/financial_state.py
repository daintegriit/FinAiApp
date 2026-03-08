from fastapi import APIRouter

from app.engines.financial_state_engine import evaluate_financial_state
from app.schemas.commitment_lock import CommitmentLockRequest

router = APIRouter()


@router.post("/financial-state")
def financial_state(req: CommitmentLockRequest):
    return evaluate_financial_state(req)