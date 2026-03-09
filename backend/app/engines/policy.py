"""
Policy Engine

Evaluates user financial behavior against policy models
defined in the policy registry.

This engine ensures decisions remain deterministic,
auditable, and reproducible by referencing policy
versions rather than embedding assumptions directly
in the code.
"""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Dict

from app.policy.tax_models.policy_registry import (
    get_policy_versions,
    get_registry_metadata,
)

from app.engines.engine_registry import register_engine


ENGINE_VERSION = "policy_engine_v1"


# --------------------------------------------------
# Core Policy Validation
# --------------------------------------------------

@register_engine("policy")
def validate_policy(
    income: float,
    expenses: float,
    savings_rate: float,
) -> Dict:
    """
    Evaluates financial behavior against baseline policies.

    Returns structured evaluation output used by API layer.
    """

    if income <= 0:
        raise ValueError("Income must be positive")

    if expenses < 0:
        raise ValueError("Expenses cannot be negative")

    if savings_rate < 0:
        raise ValueError("Savings rate cannot be negative")


    # --------------------------------------------------
    # Derived Metrics
    # --------------------------------------------------

    disposable_income = income - expenses

    actual_savings_rate = disposable_income / income if income else 0


    # --------------------------------------------------
    # Policy Evaluation Rules
    # --------------------------------------------------

    findings = []

    if actual_savings_rate < 0.10:
        findings.append(
            {
                "policy": "minimum_savings_rate",
                "status": "violation",
                "message": "Savings rate below recommended 10%",
            }
        )

    elif actual_savings_rate < 0.20:
        findings.append(
            {
                "policy": "minimum_savings_rate",
                "status": "warning",
                "message": "Savings rate below optimal 20%",
            }
        )

    else:
        findings.append(
            {
                "policy": "minimum_savings_rate",
                "status": "pass",
                "message": "Savings behavior within healthy range",
            }
        )


    if expenses / income > 0.80:
        findings.append(
            {
                "policy": "expense_ratio",
                "status": "risk",
                "message": "Expenses exceed 80% of income",
            }
        )


    # --------------------------------------------------
    # Result Object
    # --------------------------------------------------

    result = {

        "engine_version": ENGINE_VERSION,

        "evaluation_timestamp": datetime.now(UTC).isoformat(),

        "policy_versions": get_policy_versions(),

        "registry_metadata": get_registry_metadata(),

        "metrics": {

            "income": income,
            "expenses": expenses,
            "disposable_income": disposable_income,
            "savings_rate": round(actual_savings_rate, 4)

        },

        "findings": findings

    }

    return result