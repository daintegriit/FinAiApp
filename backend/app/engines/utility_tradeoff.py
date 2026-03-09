from __future__ import annotations

from typing import Optional


ENGINE_NAME = "utility_tradeoff_engine_v1"


# --------------------------------------------------
# Helper
# --------------------------------------------------

def _safe_get(obj, field, default=None):

    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(field, default)

    return getattr(obj, field, default)


# --------------------------------------------------
# Core Evaluation
# --------------------------------------------------

def evaluate_utility_tradeoff(request, engines=None):

    try:

        decision = None
        lifestyle = None

        if engines:

            decision = engines.get("decision_delta")
            lifestyle = engines.get("lifestyle_utility")

        wealth_delta = _safe_get(decision, "wealth_delta")
        utility_score = _safe_get(lifestyle, "utility_score")

        if wealth_delta is None or utility_score is None:

            return {

                "engine": ENGINE_NAME,

                "tradeoff_score": None,

                "decision_alignment": "insufficient_data",

                "financial_cost": wealth_delta,

                "lifestyle_value_score": utility_score,

                "engine_confidence": "low"
            }


        # --------------------------------------------------
        # Normalize financial impact
        # --------------------------------------------------

        financial_cost = -wealth_delta if wealth_delta < 0 else 0

        normalized_cost = min(abs(wealth_delta) / 500000, 1)

        financial_penalty_score = normalized_cost * 100


        # --------------------------------------------------
        # Compute tradeoff
        # --------------------------------------------------

        tradeoff_score = utility_score - financial_penalty_score

        tradeoff_score = round(max(0, min(100, tradeoff_score)), 2)


        # --------------------------------------------------
        # Decision classification
        # --------------------------------------------------

        if wealth_delta >= 100000:

            alignment = "financially_beneficial"

        elif wealth_delta >= 0:

            alignment = "financially_neutral"

        elif utility_score >= 70 and abs(wealth_delta) < 300000:

            alignment = "lifestyle_justified"

        elif utility_score >= 50 and abs(wealth_delta) < 150000:

            alignment = "moderate_tradeoff"

        else:

            alignment = "financially_harmful"


        # --------------------------------------------------
        # Output
        # --------------------------------------------------

        return {

            "engine": ENGINE_NAME,

            "tradeoff_score": tradeoff_score,

            "decision_alignment": alignment,

            "financial_cost": wealth_delta,

            "lifestyle_value_score": utility_score,

            "engine_confidence": "high"
        }


    except Exception as e:

        return {

            "engine": ENGINE_NAME,

            "engine_error": True,

            "error_message": str(e),

            "engine_confidence": "low"
        }