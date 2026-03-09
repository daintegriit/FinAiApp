"""
Monte Carlo simulation runner for financial engine stress testing.

This script performs nested Monte Carlo stress testing by generating
randomized financial assumptions and evaluating the portfolio growth
engine across many scenarios.

Outputs summary statistics and exports full results for visualization.
"""

import json
import random
import statistics
from datetime import datetime, UTC
from pathlib import Path
from typing import List

from app.engines.portfolio_growth import (
    PortfolioAssumptions,
    evaluate_portfolio_growth,
)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

NUM_SIMULATIONS = 200

OUTPUT_DIR = Path("validation_runs")
OUTPUT_FILE = OUTPUT_DIR / "monte_carlo_results.json"


# --------------------------------------------------
# Scenario Generation
# --------------------------------------------------

def generate_random_assumptions() -> PortfolioAssumptions:
    """
    Generate randomized portfolio assumptions.
    """

    return PortfolioAssumptions(
        monthly_contribution=random.uniform(200, 1500),
        years=random.randint(10, 35),
        annual_return=random.uniform(0.04, 0.10),
        volatility=random.uniform(0.10, 0.30),
        simulations=300,
    )


# --------------------------------------------------
# Simulation Runner
# --------------------------------------------------

def run_simulation() -> float:
    """
    Run one simulation scenario.
    """

    assumptions = generate_random_assumptions()

    result = evaluate_portfolio_growth(assumptions)

    return result.median_wealth


# --------------------------------------------------
# Risk Metrics
# --------------------------------------------------

def value_at_risk(data: List[float], percentile: float = 0.05) -> float:
    """
    Compute Value-at-Risk (VaR).
    """

    sorted_data = sorted(data)

    index = int(len(sorted_data) * percentile)

    return sorted_data[index]


def expected_shortfall(data: List[float], percentile: float = 0.05) -> float:
    """
    Compute Expected Shortfall (CVaR).
    """

    sorted_data = sorted(data)

    cutoff = int(len(sorted_data) * percentile)

    tail = sorted_data[:cutoff]

    return statistics.mean(tail) if tail else sorted_data[0]


# --------------------------------------------------
# Main Execution
# --------------------------------------------------

def main():

    results: List[float] = []

    for _ in range(NUM_SIMULATIONS):

        results.append(run_simulation())

    mean_val = statistics.mean(results)
    median_val = statistics.median(results)
    min_val = min(results)
    max_val = max(results)
    std_val = statistics.stdev(results)

    var_5 = value_at_risk(results, 0.05)
    es_5 = expected_shortfall(results, 0.05)

    print("\nMonte Carlo Engine Stress Test")
    print("--------------------------------")

    print("Runs:", NUM_SIMULATIONS)
    print("Average outcome:", round(mean_val, 2))
    print("Median outcome:", round(median_val, 2))
    print("Worst outcome:", round(min_val, 2))
    print("Best outcome:", round(max_val, 2))
    print("Std deviation:", round(std_val, 2))
    print("VaR (5%):", round(var_5, 2))
    print("Expected Shortfall (5%):", round(es_5, 2))

    # --------------------------------------------------
    # Export Results
    # --------------------------------------------------

    OUTPUT_DIR.mkdir(exist_ok=True)

    export_data = {
        "timestamp": datetime.now(UTC).isoformat(),
        "simulations": NUM_SIMULATIONS,
        "summary": {
            "mean": mean_val,
            "median": median_val,
            "min": min_val,
            "max": max_val,
            "std_dev": std_val,
            "var_5": var_5,
            "expected_shortfall_5": es_5,
        },
        "results": results,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(export_data, f, indent=2)

    print("\nResults exported to:")
    print(OUTPUT_FILE)


# --------------------------------------------------

if __name__ == "__main__":
    main()