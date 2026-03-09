from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.engines.scenario import run_scenario

router = APIRouter(
    prefix="/scenario",
    tags=["Scenario"]
)


class ScenarioRequest(BaseModel):
    scenario: str


@router.post("/simulate")
def simulate_scenario(req: ScenarioRequest):

    try:

        result = run_scenario(req.scenario)

        return {
            "status": "success",
            "scenario": req.scenario,
            "result": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))