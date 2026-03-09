from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engines.peer_benchmark import run_peer_benchmark

router = APIRouter(
    prefix="/benchmark",
    tags=["Benchmark"]
)


class BenchmarkRequest(BaseModel):
    income: float
    savings: float


@router.post("/compare")
def compare(req: BenchmarkRequest):

    try:

        result = run_peer_benchmark(
            income=req.income,
            savings=req.savings
        )

        return {
            "status": "success",
            "benchmark": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))