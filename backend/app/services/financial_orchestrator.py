from __future__ import annotations

import time
import asyncio
import logging
from typing import Dict, Any

from app.engines.policy import validate_policy
from app.engines.portfolio_growth import (
    evaluate_portfolio_growth,
    PortfolioAssumptions,
)
from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.scenario import evaluate_scenarios

logger = logging.getLogger(__name__)


class EngineResult:

    def __init__(self, name: str, result: Any, runtime_ms: float):
        self.name = name
        self.result = result
        self.runtime_ms = runtime_ms


class FinancialOrchestrator:
    """
    Central engine coordinator.

    Responsible for:
    • executing financial engines
    • collecting runtime metrics
    • isolating failures
    • returning unified results
    """

    def __init__(self):

        self.engines = {
            "policy": self._run_policy,
            "portfolio": self._run_portfolio,
            "commitment": self._run_commitment,
            "scenarios": self._run_scenarios,
        }

    # --------------------------------------------------
    # Input Normalization
    # --------------------------------------------------

    def _build_portfolio_assumptions(self, data: Dict[str, Any]) -> PortfolioAssumptions:

        return PortfolioAssumptions(
            monthly_contribution=data.get("monthly_contribution", 0),
            years=data.get("investment_years", data.get("years", 0)),
            annual_return=data.get("expected_return", 0.07),
            volatility=data.get("volatility", 0.15),
            simulations=data.get("simulations", 500),
        )

    # --------------------------------------------------
    # Engine Wrappers
    # --------------------------------------------------

    async def _run_policy(self, data: Dict[str, Any]) -> EngineResult:

        start = time.perf_counter()

        result = validate_policy(
            income=data.get("income"),
            expenses=data.get("expenses"),
            savings_rate=data.get("savings_rate"),
        )

        runtime = (time.perf_counter() - start) * 1000

        return EngineResult("policy", result, runtime)

    async def _run_portfolio(self, data: Dict[str, Any]) -> EngineResult:

        start = time.perf_counter()

        assumptions = self._build_portfolio_assumptions(data)

        result = evaluate_portfolio_growth(assumptions)

        runtime = (time.perf_counter() - start) * 1000

        return EngineResult("portfolio", result, runtime)

    async def _run_commitment(self, data: Dict[str, Any]) -> EngineResult:

        start = time.perf_counter()

        result = evaluate_commitment_lock(data)

        runtime = (time.perf_counter() - start) * 1000

        return EngineResult("commitment", result, runtime)

    async def _run_scenarios(self, data: Dict[str, Any]) -> EngineResult:

        start = time.perf_counter()

        result = evaluate_scenarios(data.get("scenarios", []))

        runtime = (time.perf_counter() - start) * 1000

        return EngineResult("scenarios", result, runtime)

    # --------------------------------------------------
    # Main Orchestration
    # --------------------------------------------------

    async def run(self, data: Dict[str, Any]) -> Dict[str, Any]:

        start_total = time.perf_counter()

        # Keep engine names paired with tasks
        tasks = [
            (name, engine(data))
            for name, engine in self.engines.items()
        ]

        results = await asyncio.gather(
            *[task for _, task in tasks],
            return_exceptions=True
        )

        engine_outputs: Dict[str, Any] = {}
        engine_timings: Dict[str, float] = {}

        for (name, _), result in zip(tasks, results):

            if isinstance(result, Exception):

                logger.exception("Engine failure")

                engine_outputs[name] = {
                    "status": "failed",
                    "error": str(result),
                }

                engine_timings[name] = 0.0
                continue

            engine_outputs[result.name] = result.result
            engine_timings[result.name] = round(result.runtime_ms, 2)

        total_runtime = round((time.perf_counter() - start_total) * 1000, 2)

        return {
            "engines": engine_outputs,
            "engine_timings": engine_timings,
            "total_runtime_ms": total_runtime,
        }