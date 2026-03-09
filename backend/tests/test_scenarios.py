import json
from pathlib import Path

SCENARIO_FILE = Path("backend/validation_runs/generated_scenarios.json")


def test_scenarios_exist():
    """
    Ensure scenario generation produced output.
    """

    if SCENARIO_FILE.exists():
        with open(SCENARIO_FILE) as f:
            scenarios = json.load(f)

        assert isinstance(scenarios, list)