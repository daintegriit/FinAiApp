
import logging
import time
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.auth.dependencies import get_current_active_user
from app.engines.scenario import (
    ScenarioEngineResponse,
    ScenarioInput,
    evaluate_scenarios,
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/scenario",
    tags=["Scenario Engine"],
)

# Each scenario runs the full financial_state engine chain. Unbounded,
# a single request with 10,000 entries pins a worker indefinitely.
MAX_SCENARIOS = 20


@router.post(
    "/evaluate",
    response_model=ScenarioEngineResponse,
    summary="Run financial what-if scenario simulations",
)
def evaluate(
    scenarios: List[ScenarioInput] = Body(
        ..., min_length=1, max_length=MAX_SCENARIOS
    ),
    current_user: User = Depends(get_current_active_user),
) -> ScenarioEngineResponse:
    """
    Run multiple financial what-if simulations.

    Pure compute, no AI call, so this is not quota-metered — it stays
    unlimited as a retention feature. Only /simulations and /ai/narrate
    consume the monthly allowance.
    """

    start = time.perf_counter()

    try:
        logger.info(
            "Scenario simulation started (%s scenarios) for user %s",
            len(scenarios),
            current_user.id,
        )

        result = evaluate_scenarios(scenarios)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info("Scenario simulation completed in %sms", elapsed_ms)

        return result

    except ValueError as e:
        logger.warning("Scenario validation error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception:
        # Internal messages are no longer echoed to the client: engine
        # exceptions can carry table names and column values.
        logger.exception("Scenario engine failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scenario simulation failed",
        )