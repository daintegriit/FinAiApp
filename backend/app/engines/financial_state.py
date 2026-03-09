from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC

from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.financial_identity import evaluate_financial_identity
from app.engines.financial_optionality import evaluate_optionality
from app.engines.income_volatility_shock import evaluate_income_volatility
from app.engines.macro_sensitivity import evaluate_macro_sensitivity
from app.engines.peer_benchmark import evaluate_peer_benchmark
from app.engines.peer_trajectory import evaluate_peer_trajectory
from app.engines.global_impact import evaluate_global_impact
from app.engines.financial_resilience import evaluate_financial_resilience
from app.engines.behavioral_drift import evaluate_behavioral_drift
from app.engines.decision_delta import evaluate_decision_delta
from app.engines.portfolio_growth import evaluate_portfolio_growth, PortfolioAssumptions
from app.engines.shock_simulator import evaluate_shock_simulator
from app.engines.lifestyle_utility import (
    evaluate_lifestyle_utility,
    LifestyleUtilityRequest,
)
from app.engines.utility_tradeoff import evaluate_utility_tradeoff
from app.engines.regret_minimization import evaluate_regret_minimization
from app.engines.option_value import evaluate_option_value

from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_state_engine_v7"


# --------------------------------------------------
# Safe Execution Wrapper
# --------------------------------------------------

def _safe_engine_run(engine_fn, request):
    try:
        return engine_fn(request)
    except Exception as e:
        return {
            "engine_error": True,
            "engine": getattr(engine_fn, "__name__", "unknown_engine"),
            "error_message": str(e),
            "engine_confidence": "low",
        }


# --------------------------------------------------
# Score Fusion
# --------------------------------------------------

def _extract_score(obj, field):
    if isinstance(obj, dict):
        return obj.get(field)
    return getattr(obj, field, None)


def _compute_global_scores(results):

    scores = []

    fields = [
        ("commitment_lock", "lock_score"),
        ("income_volatility", "volatility_score"),
        ("macro_sensitivity", "macro_sensitivity_score"),
        ("peer_benchmark", "peer_score"),
        ("global_impact", "impact_score"),
        ("financial_resilience", "resilience_score"),
        ("behavioral_drift", "drift_score"),
    ]

    for engine, field in fields:

        value = _extract_score(results.get(engine), field)

        if value is not None:
            scores.append(value)

    if not scores:
        return None

    return round(sum(scores) / len(scores), 2)


# --------------------------------------------------
# Engine Entry
# --------------------------------------------------

def evaluate_financial_state(request):

    start_time = time.perf_counter()

    request_id = str(uuid.uuid4())
    policy_versions = get_policy_versions()
    timestamp = datetime.now(UTC)

    # --------------------------------------------------
    # Execute Base Engines
    # --------------------------------------------------

    commitment = _safe_engine_run(evaluate_commitment_lock, request)
    identity = _safe_engine_run(evaluate_financial_identity, request)
    optionality = _safe_engine_run(evaluate_optionality, request)
    volatility = _safe_engine_run(evaluate_income_volatility, request)
    macro = _safe_engine_run(evaluate_macro_sensitivity, request)
    peer = _safe_engine_run(evaluate_peer_benchmark, request)
    trajectory = _safe_engine_run(evaluate_peer_trajectory, request)

    # --------------------------------------------------
    # Portfolio Growth
    # --------------------------------------------------

    portfolio = _safe_engine_run(
        lambda req: evaluate_portfolio_growth(
            PortfolioAssumptions(
                monthly_contribution=max(
                    getattr(req, "current_free_cashflow", 0)
                    - getattr(req, "monthly_payment", 0),
                    0,
                ),
                years=30,
            )
        ),
        request,
    )

    impact = _safe_engine_run(evaluate_global_impact, request)
    shock = _safe_engine_run(evaluate_shock_simulator, request)
    resilience = _safe_engine_run(evaluate_financial_resilience, request)
    drift = _safe_engine_run(evaluate_behavioral_drift, request)
    decision_delta = _safe_engine_run(evaluate_decision_delta, request)

    # --------------------------------------------------
    # Lifestyle Utility (FIXED)
    # --------------------------------------------------

    lifestyle = _safe_engine_run(
        lambda req: evaluate_lifestyle_utility(
            LifestyleUtilityRequest(
                purchase_category=getattr(req, "purchase_category", None),
                lifestyle_priority=getattr(req, "lifestyle_priority", None),
                commute_improvement=getattr(req, "commute_improvement", None),
                family_value=getattr(req, "family_value", None),
                personal_satisfaction=getattr(req, "personal_satisfaction", None),
            )
        ),
        request,
    )

    # --------------------------------------------------
    # Build Engine Dict
    # --------------------------------------------------

    engines = {
        "commitment_lock": commitment,
        "financial_identity": identity,
        "financial_optionality": optionality,
        "income_volatility": volatility,
        "macro_sensitivity": macro,
        "peer_benchmark": peer,
        "peer_trajectory": trajectory,
        "portfolio_growth": portfolio,
        "global_impact": impact,
        "shock_simulator": shock,
        "financial_resilience": resilience,
        "behavioral_drift": drift,
        "decision_delta": decision_delta,
        "lifestyle_utility": lifestyle,
    }

    # --------------------------------------------------
    # Execute Dependent Engines
    # --------------------------------------------------

    option_value = _safe_engine_run(
        lambda req: evaluate_option_value(req, engines),
        request,
    )

    engines["option_value"] = option_value

    tradeoff = _safe_engine_run(
        lambda req: evaluate_utility_tradeoff(req, engines),
        request,
    )

    engines["utility_tradeoff"] = tradeoff

    regret = _safe_engine_run(
        lambda req: evaluate_regret_minimization(req, engines),
        request,
    )

    engines["regret_minimization"] = regret

    # --------------------------------------------------
    # Global Score
    # --------------------------------------------------

    global_financial_score = _compute_global_scores(engines)

    # --------------------------------------------------
    # Processing metrics
    # --------------------------------------------------

    processing_ms = int((time.perf_counter() - start_time) * 1000)

    # --------------------------------------------------
    # Final Structured Response
    # --------------------------------------------------

    return {
        "request_id": request_id,
        "engine_version": ENGINE_VERSION,
        "timestamp": timestamp,
        "processing_ms": processing_ms,
        "policy_versions": policy_versions,
        "global_financial_score": global_financial_score,
        "engine_count": len(engines),
        "engines": engines,
    }