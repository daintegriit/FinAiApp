"""
Simple progressive tax model stub.
Used until country-specific tax engines are implemented.
"""


def calculate_tax(income: float) -> float:

    if income <= 20000:
        rate = 0.1
    elif income <= 80000:
        rate = 0.2
    else:
        rate = 0.3

    return income * rate