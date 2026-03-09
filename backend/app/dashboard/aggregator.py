from __future__ import annotations

import time
import logging

from app.schemas.dashboard import DashboardRequest, DashboardResponse
from app.services.financial_orchestrator import FinancialOrchestrator

logger = logging.getLogger(__name__)

orchestrator = FinancialOrchestrator()


# --------------------------------------------------
# Dashboard Builder
# --------------------------------------------------

async def build_dashboard(req: DashboardRequest) -> DashboardResponse:
    """
    Diamond Financial Dashboard Aggregator

    Uses the FinancialOrchestrator to execute all financial engines
    and constructs a DashboardResponse.
    """

    start_total = time.perf_counter()

    logger.info("Dashboard aggregation started")

    # --------------------------------------------------
    # Run orchestrator
    # --------------------------------------------------

    orchestration = await orchestrator.run(req.dict())

    engines = orchestration.get("engines", {})
    engine_timings = orchestration.get("engine_timings", {})

    total_runtime = orchestration.get("total_runtime_ms")

    logger.info(
        "Dashboard aggregation completed in %sms",
        total_runtime
    )

    # --------------------------------------------------
    # Construct Dashboard Response
    # --------------------------------------------------

    return DashboardResponse(

        financial_state=engines.get("financial_state"),

        portfolio_projection=engines.get("portfolio"),

        commitment_analysis=engines.get("commitment"),

        policy_validation=engines.get("policy"),

        scenario_results=engines.get("scenarios"),

        engine_timings=engine_timings,

        processing_ms=total_runtime
    )