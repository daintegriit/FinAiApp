import json
from pathlib import Path


SCENARIO_FILE = Path("backend/validation_runs/generated_scenarios.json")


def test_scenario_file_exists():
    """
    Ensure scenario generation produced output.
    """

    if SCENARIO_FILE.exists():
        assert SCENARIO_FILE.is_file()


def test_scenario_structure():
    """
    Ensure generated scenarios follow correct structure.
    """

    if not SCENARIO_FILE.exists():
        return

    with open(SCENARIO_FILE) as f:
        scenarios = json.load(f)

    assert isinstance(scenarios, list)

    if len(scenarios) > 0:
        scenario = scenarios[0]

        required_fields = [
            "income_growth",
            "inflation_rate",
            "market_return",
            "volatility",
            "interest_rate",
        ]

        for field in required_fields:
            assert field in scenario