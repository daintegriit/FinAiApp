from __future__ import annotations

import asyncio
import inspect
import logging
import time
import uuid
from decimal import Decimal
from typing import Any, Dict, Callable, Tuple

# Ensure engine decorators run and populate registry
import app.engines  # noqa: F401

from app.engines.engine_registry import ENGINE_REGISTRY
from app.engines.portfolio_growth import PortfolioAssumptions
from app.schemas.commitment_lock import CommitmentLockRequest


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

    def __init__(self) -> None:
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
    # Shared helpers
    # --------------------------------------------------

    @staticmethod
    def _as_float(value: Any, default: float = 0.0) -> float:
        if value is None:
            return default
        if isinstance(value, Decimal):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _normalize_request(
        self,
        data: CommitmentLockRequest | Dict[str, Any],
    ) -> Tuple[CommitmentLockRequest, Dict[str, Any]]:
        """
        Accept either a Pydantic model or a dict and normalize into both forms.

        Engines that are model-based receive the model.
        Engines that are kwargs/dict-based receive derived dict payloads.
        """

        if isinstance(data, CommitmentLockRequest):
            req = data
            payload = data.model_dump()
            return req, payload

        if isinstance(data, dict):
            req = CommitmentLockRequest(**data)
            payload = req.model_dump()
            return req, payload

        raise TypeError(
            f"Unsupported orchestrator input type: {type(data).__name__}"
        )

    # --------------------------------------------------
    # Input Normalization
    # --------------------------------------------------

    def _build_portfolio_assumptions(
        self,
        req: CommitmentLockRequest,
        data: Dict[str, Any],
    ) -> PortfolioAssumptions:
        """
        Build strongly typed portfolio assumptions.

        Defaults are intentionally conservative and derived from the request
        shape your current schema supports.
        """

        monthly_contribution = (
            self._as_float(req.goal_monthly_contribution, 0.0)
            if req.goal_monthly_contribution is not None
            else self._as_float(req.monthly_payment, 0.0)
        )

        years = req.decision_horizon_years or 30

        annual_return = (
            self._as_float(req.annual_return_assumption, 0.07)
            if req.annual_return_assumption is not None
            else 0.07
        )

        annual_inflation = (
            self._as_float(req.annual_inflation_assumption, 0.02)
            if req.annual_inflation_assumption is not None
            else 0.02
        )

        # PortfolioAssumptions does not currently use inflation directly,
        # but we keep the resolved value here in case the model expands later.
        _ = annual_inflation

        return PortfolioAssumptions(
            monthly_contribution=monthly_contribution,
            years=years,
            annual_return=annual_return,
            volatility=self._as_float(data.get("volatility"), 0.15),
            simulations=int(data.get("simulations", 500) or 500),
        )

    def _build_policy_args(
        self,
        req: CommitmentLockRequest,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build kwargs for the policy engine.

        The current request schema does not provide explicit `income`,
        `expenses`, or `savings_rate`, so we derive them from the request.
        """

        income = self._as_float(req.net_monthly_income, 0.0)
        free_cashflow = self._as_float(req.current_free_cashflow, 0.0)

        # Derive simple expenses estimate when income/free cashflow are present.
        expenses = max(income - free_cashflow, 0.0) if income > 0 else 0.0

        savings_rate = (free_cashflow / income) if income > 0 else 0.0

        return {
            "income": income,
            "expenses": expenses,
            "savings_rate": savings_rate,
        }

    def _build_default_scenarios(
        self,
        req: CommitmentLockRequest,
    ) -> list[dict[str, Any]]:
        """
        Provide a minimal non-empty scenario payload so the scenario engine
        does not crash on max([]) when explicit scenarios are absent.
        """

        return [
            {
                "name": "baseline",
                "purchase_category": req.purchase_category or "other",
                "monthly_payment": self._as_float(req.monthly_payment, 0.0),
                "term_months": req.term_months,
                "net_monthly_income": self._as_float(req.net_monthly_income, 0.0),
                "current_free_cashflow": self._as_float(req.current_free_cashflow, 0.0),
                "region": req.region,
                "currency": req.currency,
            }
        ]

    def _build_engine_input(
        self,
        engine_name: str,
        req: CommitmentLockRequest,
        data: Dict[str, Any],
    ) -> Any:
        """
        Convert shared orchestrator payload into engine-specific inputs.
        """

        if engine_name == "policy":
            return self._build_policy_args(req, data)

        if engine_name == "portfolio":
            return self._build_portfolio_assumptions(req, data)

        if engine_name == "commitment_lock":
            return req

        if engine_name == "behavioral_drift":
            return req

        if engine_name == "scenarios":
            scenarios = data.get("scenarios")
            return scenarios if scenarios else self._build_default_scenarios(req)

        # Default: pass the typed request model to engines.
        return req

    def _output_name(self, engine_name: str) -> str:
        return self.output_aliases.get(engine_name, engine_name)

    # --------------------------------------------------
    # Engine Execution
    # --------------------------------------------------

    async def _run_engine(
        self,
        name: str,
        engine: Callable,
        req: CommitmentLockRequest,
        data: Dict[str, Any],
    ) -> EngineResult:
        start = time.perf_counter()

        payload = self._build_engine_input(name, req, data)

        logger.debug(
            "Running engine: %s | payload_type=%s",
            name,
            type(payload).__name__,
        )

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

    async def run(
        self,
        data: CommitmentLockRequest | Dict[str, Any],
    ) -> Dict[str, Any]:
        start_total = time.perf_counter()
        run_id = str(uuid.uuid4())

        req, normalized = self._normalize_request(data)

        tasks = []
        for name in self.engine_order:
            engine = self.engines[name]
            tasks.append(
                (name, self._run_engine(name, engine, req, normalized))
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
            "Financial orchestration completed | run_id=%s engines=%s runtime=%sms",
            run_id,
            len(self.engines),
            total_runtime,
        )

        return {
            "run_id": run_id,
            "engines": engine_outputs,
            "engine_timings": engine_timings,
            "total_runtime_ms": total_runtime,
            "engine_count": len(self.engines),
            "registered_engines": list(self.engine_order),
        }