from __future__ import annotations

import time
import logging

from typing import List

from fastapi import APIRouter, HTTPException, status, Depends

from app.engines.scenario import (
    evaluate_scenarios,
    ScenarioInput,
    ScenarioEngineResponse,
)

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/scenario",
    tags=["Scenario Engine"],
)


# --------------------------------------------------
# Scenario Simulation
# --------------------------------------------------

@router.post(
    "/evaluate",
    response_model=ScenarioEngineResponse,
    summary="Run financial what-if scenario simulations",
)
def evaluate(
    scenarios: List[ScenarioInput],
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> ScenarioEngineResponse:
    """
    Run multiple financial what-if simulations.

    Each scenario can represent changes such as:
    • salary increase
    • reduced expenses
    • new financial commitments
    • increased investment contributions

    The engine evaluates each scenario and returns
    comparative results.
    """

    start = time.perf_counter()

    try:

        logger.info("Scenario simulation started (%s scenarios)", len(scenarios))

        # --------------------------------------------------
        # Execute scenario engine
        # --------------------------------------------------

        result = evaluate_scenarios(scenarios)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Scenario simulation completed in %sms",
            elapsed_ms
        )

        # attach runtime metadata if supported
        if hasattr(result, "processing_ms"):
            result.processing_ms = elapsed_ms

        return result

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Scenario validation error: %s",
            str(e)
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception("Scenario engine failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Scenario simulation failed",
                "message": str(e),
            },
        )