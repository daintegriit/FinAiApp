from scripts.run_monte_carlo import generate_random_scenario


def test_random_scenario_structure():

    scenario = generate_random_scenario()

    required_fields = [
        "market_return",
        "volatility",
        "inflation",
        "interest_rate",
    ]

    for field in required_fields:
        assert field in scenario