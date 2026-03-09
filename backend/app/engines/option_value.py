from __future__ import annotations

ENGINE_NAME = "option_value_engine_v1"


def _safe_get(obj, field, default=None):

    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(field, default)

    return getattr(obj, field, default)


def evaluate_option_value(request, engines=None):

    try:

        commitment = None
        optionality = None

        if engines:

            commitment = engines.get("commitment_lock")
            optionality = engines.get("financial_optionality")

        lock_score = _safe_get(commitment, "lock_score")
        optionality_score = _safe_get(optionality, "optionality_score")


        if lock_score is None or optionality_score is None:

            return {

                "engine": ENGINE_NAME,
                "option_value_score": None,
                "option_value_band": "insufficient_data",
                "engine_confidence": "low"

            }


        # flexibility lost due to commitment

        option_loss = lock_score * 0.6 + (100 - optionality_score) * 0.4

        option_loss = round(option_loss, 2)


        if option_loss >= 70:

            band = "severe_option_loss"

        elif option_loss >= 50:

            band = "moderate_option_loss"

        elif option_loss >= 30:

            band = "limited_option_loss"

        else:

            band = "minimal_option_loss"


        return {

            "engine": ENGINE_NAME,

            "option_value_score": option_loss,

            "option_value_band": band,

            "drivers": {

                "commitment_lock_pressure": lock_score,
                "financial_optionality": optionality_score

            },

            "engine_confidence": "high"

        }


    except Exception as e:

        return {

            "engine": ENGINE_NAME,
            "engine_error": True,
            "error_message": str(e),
            "engine_confidence": "low"

        }