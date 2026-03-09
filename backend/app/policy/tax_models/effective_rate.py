"""
Compute effective tax rate.
"""


def compute_effective_rate(income: float, tax_paid: float) -> float:

    if income <= 0:
        return 0.0

    return tax_paid / income