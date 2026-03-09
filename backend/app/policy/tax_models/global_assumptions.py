"""
Global financial assumptions used across the engine stack.
"""

DEFAULT_ASSUMPTIONS = {
    "inflation_rate": 0.03,
    "interest_rate": 0.05,
    "wage_growth": 0.03,
    "safe_debt_to_income": 0.35
}


def get_global_assumptions():
    return DEFAULT_ASSUMPTIONS