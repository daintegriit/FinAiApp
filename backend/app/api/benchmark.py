from fastapi import APIRouter, HTTPException

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.peer_benchmark import (
    evaluate_peer_benchmark,
    PeerBenchmarkResponse
)

router = APIRouter(
    prefix="/benchmark",
    tags=["Peer Benchmark"]
)


@router.post("/evaluate", response_model=PeerBenchmarkResponse)
def evaluate(req: CommitmentLockRequest):

    try:

        result = evaluate_peer_benchmark(req)

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Peer benchmark failed: {str(e)}"
        )