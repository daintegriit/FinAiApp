from fastapi import APIRouter, HTTPException
from typing import List

from app.engines.scenario import (
    evaluate_scenarios,
    ScenarioInput,
    ScenarioEngineResponse
)

router = APIRouter(
    prefix="/scenario",
    tags=["Scenario Engine"]
)


@router.post("/evaluate", response_model=ScenarioEngineResponse)
def evaluate(scenarios: List[ScenarioInput]):

    try:

        return evaluate_scenarios(scenarios)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Scenario simulation failed: {str(e)}"
        )