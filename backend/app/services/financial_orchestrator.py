from __future__ import annotations

import asyncio
import inspect
import logging
import time
from typing import Any, Dict, Callable

# Ensure engine decorators run and populate registry
import app.engines  # noqa: F401

from app.engines.engine_registry import ENGINE_REGISTRY
from app.engines.portfolio_growth import PortfolioAssumptions


logger = logging.getLogger(__name__)


class EngineResult:
    """
    Standard container for engine execution results.
    """

    def __init__(self, name: str, result: Any, runtime_ms: float):
        self.name = name
        self.result = result
        self.runtime_ms = runtime_ms


class FinancialOrchestrator:
    """
    Registry-driven financial engine orchestrator.

    Responsibilities
    ----------------
    • discover engines from ENGINE_REGISTRY
    • normalize shared request payloads
    • run engines concurrently
    • isolate failures
    • collect runtime metrics
    • return unified results
    """

    def __init__(self):

        if not ENGINE_REGISTRY:
            raise RuntimeError("ENGINE_REGISTRY is empty — engines failed to register")

        # Snapshot registry at initialization
        self.engines: Dict[str, Callable] = dict(ENGINE_REGISTRY)

        # Deterministic order (important for tests)
        self.engine_order = sorted(self.engines.keys())

        # Maintain backward-compatible output keys
        self.output_aliases = {
            "policy": "policy",
            "portfolio": "portfolio",
            "commitment_lock": "commitment",
            "scenarios": "scenarios",
            "behavioral_drift": "behavioral_drift",
        }

        logger.info(
            "FinancialOrchestrator initialized with %s engines",
            len(self.engines),
        )

    # --------------------------------------------------
    # Input Normalization
    # --------------------------------------------------

    def _build_portfolio_assumptions(
        self,
        data: Dict[str, Any],
    ) -> PortfolioAssumptions:

        return PortfolioAssumptions(
            monthly_contribution=data.get("monthly_contribution", 0),
            years=data.get("investment_years", data.get("years", 0)),
            annual_return=data.get("expected_return", 0.07),
            volatility=data.get("volatility", 0.15),
            simulations=data.get("simulations", 500),
        )

    def _build_policy_args(self, data: Dict[str, Any]) -> Dict[str, Any]:

        return {
            "income": data.get("income"),
            "expenses": data.get("expenses"),
            "savings_rate": data.get("savings_rate"),
        }

    def _build_engine_input(
        self,
        engine_name: str,
        data: Dict[str, Any],
    ) -> Any:
        """
        Convert shared orchestrator payload into engine-specific inputs.
        """

        if engine_name == "policy":
            return self._build_policy_args(data)

        if engine_name == "portfolio":
            return self._build_portfolio_assumptions(data)

        if engine_name == "commitment_lock":
            return data.get("commitment_request", data)

        if engine_name == "scenarios":
            return data.get("scenarios", [])

        if engine_name == "behavioral_drift":
            return data.get("commitment_request", data)

        return data

    def _output_name(self, engine_name: str) -> str:
        return self.output_aliases.get(engine_name, engine_name)

    # --------------------------------------------------
    # Engine Execution
    # --------------------------------------------------

    async def _run_engine(
        self,
        name: str,
        engine: Callable,
        data: Dict[str, Any],
    ) -> EngineResult:

        start = time.perf_counter()

        payload = self._build_engine_input(name, data)

        logger.debug("Running engine: %s", name)

        try:

            # Handle engines with different signatures
            if name == "policy":
                result = engine(**payload)
            else:
                result = engine(payload)

            # Support async engines
            if inspect.iscoroutine(result):
                result = await result

        except Exception as exc:

            logger.exception("Engine failed: %s", name)

            raise RuntimeError(
                f"{name} engine failed: {str(exc)}"
            ) from exc

        runtime = (time.perf_counter() - start) * 1000

        return EngineResult(
            name=self._output_name(name),
            result=result,
            runtime_ms=runtime,
        )

    # --------------------------------------------------
    # Main Orchestration
    # --------------------------------------------------

    async def run(self, data: Dict[str, Any]) -> Dict[str, Any]:

        start_total = time.perf_counter()

        tasks = []

        for name in self.engine_order:
            engine = self.engines[name]
            tasks.append(
                (name, self._run_engine(name, engine, data))
            )

        results = await asyncio.gather(
            *[task for _, task in tasks],
            return_exceptions=True,
        )

        engine_outputs: Dict[str, Any] = {}
        engine_timings: Dict[str, float] = {}

        for (registered_name, _), result in zip(tasks, results):

            output_name = self._output_name(registered_name)

            if isinstance(result, Exception):

                logger.error(
                    "Engine execution failure: %s",
                    registered_name,
                )

                engine_outputs[output_name] = {
                    "status": "failed",
                    "error": str(result),
                }

                engine_timings[output_name] = 0.0
                continue

            engine_outputs[result.name] = result.result
            engine_timings[result.name] = round(result.runtime_ms, 2)

        total_runtime = round(
            (time.perf_counter() - start_total) * 1000,
            2,
        )

        logger.info(
            "Financial orchestration completed | engines=%s runtime=%sms",
            len(self.engines),
            total_runtime,
        )

        return {
            "engines": engine_outputs,
            "engine_timings": engine_timings,
            "total_runtime_ms": total_runtime,
            "engine_count": len(self.engines),
            "registered_engines": list(self.engine_order),
        }