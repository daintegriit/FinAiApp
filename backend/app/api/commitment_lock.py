from fastapi import APIRouter
from app.schemas.commitment_lock import CommitmentLockRequest, CommitmentLockResponse
from app.engines.commitment_lock import evaluate_commitment_lock

router = APIRouter(prefix="/commitment-lock", tags=["Commitment Lock Engine"])

@router.post("/evaluate", response_model=CommitmentLockResponse)
def evaluate(req: CommitmentLockRequest) -> CommitmentLockResponse:
    return evaluate_commitment_lock(req)
