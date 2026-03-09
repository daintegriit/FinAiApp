# backend/scripts/generate_scenarios.py

"""
Generate synthetic financial scenarios used for validation and testing.
"""

import json
import random
from pathlib import Path

OUTPUT_DIR = Path("../validation_runs")
OUTPUT_DIR.mkdir(exist_ok=True)


def generate_scenario():
    return {
        "income_growth": random.uniform(-0.05, 0.08),
        "inflation_rate": random.uniform(0.01, 0.07),
        "market_return": random.uniform(-0.20, 0.15),
        "volatility": random.uniform(0.05, 0.40),
        "interest_rate": random.uniform(0.01, 0.08),
    }


def main():
    scenarios = [generate_scenario() for _ in range(50)]

    output_file = OUTPUT_DIR / "generated_scenarios.json"

    with open(output_file, "w") as f:
        json.dump(scenarios, f, indent=2)

    print(f"Generated {len(scenarios)} scenarios → {output_file}")


if __name__ == "__main__":
    main()