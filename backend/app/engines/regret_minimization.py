from __future__ import annotations

ENGINE_NAME = "regret_minimization_engine_v1"


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

def evaluate_regret_minimization(request, engines=None):

    try:

        decision = None
        lifestyle = None
        tradeoff = None

        if engines:

            decision = engines.get("decision_delta")
            lifestyle = engines.get("lifestyle_utility")
            tradeoff = engines.get("utility_tradeoff")

        wealth_delta = _safe_get(decision, "wealth_delta")
        utility_score = _safe_get(lifestyle, "utility_score")
        alignment = _safe_get(tradeoff, "decision_alignment")


        if wealth_delta is None or utility_score is None:

            return {

                "engine": ENGINE_NAME,

                "regret_score": None,

                "regret_outlook": "insufficient_data",

                "future_regret_risk": None,

                "engine_confidence": "low"
            }


        # --------------------------------------------------
        # Financial regret risk
        # --------------------------------------------------

        financial_regret = 0

        if wealth_delta < -300000:
            financial_regret = 80

        elif wealth_delta < -150000:
            financial_regret = 60

        elif wealth_delta < -50000:
            financial_regret = 40

        else:
            financial_regret = 10


        # --------------------------------------------------
        # Lifestyle regret risk
        # --------------------------------------------------

        lifestyle_regret = 0

        if utility_score >= 75:
            lifestyle_regret = 10

        elif utility_score >= 60:
            lifestyle_regret = 20

        elif utility_score >= 40:
            lifestyle_regret = 40

        else:
            lifestyle_regret = 70


        # --------------------------------------------------
        # Combine regret signals
        # --------------------------------------------------

        regret_score = round((financial_regret + lifestyle_regret) / 2, 2)


        # --------------------------------------------------
        # Outlook classification
        # --------------------------------------------------

        if regret_score <= 25:

            outlook = "very_low_regret"

        elif regret_score <= 45:

            outlook = "low_regret"

        elif regret_score <= 65:

            outlook = "moderate_regret"

        else:

            outlook = "high_regret"


        # --------------------------------------------------
        # Recommendation signal
        # --------------------------------------------------

        if alignment == "financially_beneficial":

            recommendation = "strong_positive"

        elif alignment == "lifestyle_justified":

            recommendation = "acceptable_tradeoff"

        elif alignment == "moderate_tradeoff":

            recommendation = "caution"

        elif alignment == "financially_harmful":

            recommendation = "high_risk_decision"

        else:

            recommendation = "neutral"


        # --------------------------------------------------
        # Output
        # --------------------------------------------------

        return {

            "engine": ENGINE_NAME,

            "regret_score": regret_score,

            "regret_outlook": outlook,

            "future_regret_risk": {

                "financial_regret": financial_regret,

                "lifestyle_regret": lifestyle_regret

            },

            "decision_recommendation": recommendation,

            "engine_confidence": "high"
        }


    except Exception as e:

        return {

            "engine": ENGINE_NAME,

            "engine_error": True,

            "error_message": str(e),

            "engine_confidence": "low"
        }