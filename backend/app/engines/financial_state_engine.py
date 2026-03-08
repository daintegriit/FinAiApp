from __future__ import annotations

import time
import uuid
from datetime import datetime

from app.engines.commitment_lock import evaluate_commitment_lock
from app.engines.financial_identity import evaluate_financial_identity
from app.engines.financial_optionality import evaluate_optionality
from app.engines.income_volatility_shock import evaluate_income_volatility
from app.engines.macro_sensitivity import evaluate_macro_sensitivity
from app.engines.peer_benchmark import evaluate_peer_benchmark
from app.engines.global_impact import evaluate_global_impact
from app.engines.financial_resilience import evaluate_financial_resilience
from app.engines.behavioral_drift import evaluate_behavioral_drift

from app.policy.policy_registry import get_policy_versions


ENGINE_VERSION = "financial_state_engine_v2"


# --------------------------------------------------
# Safe Execution Wrapper
# --------------------------------------------------

def _safe_engine_run(engine_fn, request):

    try:
        return engine_fn(request)

    except Exception as e:

        return {
            "engine_error": True,
            "engine": engine_fn.__name__,
            "error_message": str(e),
            "engine_confidence": "low"
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

        ("behavioral_drift", "drift_score")

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

    timestamp = datetime.utcnow()

    # --------------------------------------------------
    # Execute Engines
    # --------------------------------------------------

    commitment = _safe_engine_run(evaluate_commitment_lock, request)

    identity = _safe_engine_run(evaluate_financial_identity, request)

    optionality = _safe_engine_run(evaluate_optionality, request)

    volatility = _safe_engine_run(evaluate_income_volatility, request)

    macro = _safe_engine_run(evaluate_macro_sensitivity, request)

    peer = _safe_engine_run(evaluate_peer_benchmark, request)

    impact = _safe_engine_run(evaluate_global_impact, request)

    resilience = _safe_engine_run(evaluate_financial_resilience, request)

    drift = _safe_engine_run(evaluate_behavioral_drift, request)


    engines = {

        "commitment_lock": commitment,

        "financial_identity": identity,

        "financial_optionality": optionality,

        "income_volatility": volatility,

        "macro_sensitivity": macro,

        "peer_benchmark": peer,

        "global_impact": impact,

        "financial_resilience": resilience,

        "behavioral_drift": drift
    }


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

        "engines": engines
    }