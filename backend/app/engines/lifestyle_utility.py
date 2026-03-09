from __future__ import annotations

import time
import uuid
from datetime import datetime, UTC
from dataclasses import dataclass
from typing import Optional, Dict, Any


ENGINE_NAME = "lifestyle_utility_engine_v2"


# --------------------------------------------------
# Request Model
# --------------------------------------------------

@dataclass
class LifestyleUtilityRequest:

    purchase_category: Optional[str] = None

    lifestyle_priority: Optional[str] = None

    commute_improvement: Optional[float] = None

    family_value: Optional[float] = None

    personal_satisfaction: Optional[float] = None


# --------------------------------------------------
# Helper
# --------------------------------------------------

def _normalize(value: Optional[float], max_value: float) -> float:

    if value is None:
        return 0.0

    try:

        v = float(value)

        if v <= 0:
            return 0.0

        return min(v / max_value, 1.0)

    except (ValueError, TypeError):

        return 0.0


# --------------------------------------------------
# Core Evaluation
# --------------------------------------------------

def evaluate_lifestyle_utility(
    request: LifestyleUtilityRequest
) -> Dict[str, Any]:

    start = time.perf_counter()

    request_id = str(uuid.uuid4())

    timestamp = datetime.now(UTC)

    try:

        purchase_category = request.purchase_category
        lifestyle_priority = request.lifestyle_priority

        commute_improvement = request.commute_improvement
        family_value = request.family_value
        personal_satisfaction = request.personal_satisfaction


        # --------------------------------------------------
        # Base Utility Scores
        # --------------------------------------------------

        housing_stability = 0.0
        location_quality = 0.0
        lifestyle_preference = 0.0

        if purchase_category == "housing":
            housing_stability = 30

        if purchase_category == "vehicle":
            location_quality = 15

        if purchase_category == "experience":
            lifestyle_preference = 25


        if lifestyle_priority == "family":
            housing_stability += 10

        if lifestyle_priority == "mobility":
            location_quality += 10

        if lifestyle_priority == "personal":
            lifestyle_preference += 10


        # --------------------------------------------------
        # Quantitative Inputs
        # --------------------------------------------------

        commute_score = _normalize(commute_improvement, 60) * 20

        family_score = _normalize(family_value, 10) * 20

        satisfaction_score = _normalize(personal_satisfaction, 10) * 20


        # --------------------------------------------------
        # Aggregate Utility
        # --------------------------------------------------

        utility_score = (
            housing_stability
            + location_quality
            + lifestyle_preference
            + commute_score
            + family_score
            + satisfaction_score
        )

        utility_score = round(min(100, utility_score), 2)


        # --------------------------------------------------
        # Category
        # --------------------------------------------------

        if utility_score >= 70:

            category = "high_lifestyle_value"

        elif utility_score >= 45:

            category = "moderate_lifestyle_value"

        else:

            category = "low_lifestyle_value"


        processing_ms = int((time.perf_counter() - start) * 1000)


        # --------------------------------------------------
        # Output
        # --------------------------------------------------

        return {

            "engine": ENGINE_NAME,

            "request_id": request_id,

            "timestamp": timestamp.isoformat(),

            "processing_ms": processing_ms,

            "utility_score": utility_score,

            "utility_category": category,

            "utility_breakdown": {

                "housing_stability": round(housing_stability, 2),

                "location_quality": round(location_quality, 2),

                "lifestyle_preference": round(lifestyle_preference, 2),

                "commute_score": round(commute_score, 2),

                "family_score": round(family_score, 2),

                "personal_satisfaction": round(satisfaction_score, 2)

            },

            "engine_confidence": "high"
        }

    except Exception as e:

        processing_ms = int((time.perf_counter() - start) * 1000)

        return {

            "engine": ENGINE_NAME,

            "request_id": request_id,

            "timestamp": timestamp.isoformat(),

            "processing_ms": processing_ms,

            "engine_error": True,

            "error_message": str(e),

            "engine_confidence": "low"
        }