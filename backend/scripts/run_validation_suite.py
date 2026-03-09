import requests
import json
import os
from datetime import datetime

API_URL = "http://localhost:8080/api/financial/analyze"


tests = [
    {
        "name": "Baseline Household",
        "payload": {
            "monthly_payment": 750,
            "term_months": 36,
            "net_monthly_income": 7500,
            "current_free_cashflow": 900,
            "purchase_category": "housing",
            "lifestyle_priority": "family",
            "family_value": 9,
            "personal_satisfaction": 8,
            "income_stability": 0.85,
            "savings_buffer": 20000,
            "existing_debt": 5000,
            "age": 34
        }
    },
    {
        "name": "Overleveraged Scenario",
        "payload": {
            "monthly_payment": 3200,
            "term_months": 72,
            "net_monthly_income": 4200,
            "current_free_cashflow": 150,
            "purchase_category": "car",
            "lifestyle_priority": "status",
            "family_value": 3,
            "personal_satisfaction": 9,
            "income_stability": 0.7,
            "savings_buffer": 2000,
            "existing_debt": 25000,
            "age": 28
        }
    },
    {
        "name": "Wealth Builder",
        "payload": {
            "monthly_payment": 1,
            "term_months": 12,
            "net_monthly_income": 12000,
            "current_free_cashflow": 5000,
            "purchase_category": "consumer",
            "lifestyle_priority": "wealth",
            "family_value": 6,
            "personal_satisfaction": 7,
            "income_stability": 0.95,
            "savings_buffer": 250000,
            "existing_debt": 0,
            "age": 40
        }
    }
]


def run_tests():

    print("\n==============================")
    print("Running Financial Engine Validation")
    print("==============================\n")

    results = []

    for test in tests:

        try:

            r = requests.post(API_URL, json=test["payload"], timeout=30)

            if r.status_code != 200:
                print(f"[FAIL] {test['name']}")
                print(f"HTTP Status: {r.status_code}")
                print(r.text)
                print("-" * 60)
                continue

            result = r.json()

            score = result.get("global_financial_score")
            processing_ms = result.get("processing_ms")

            # supports both old and new API structure
            engines = result.get("engines") or result.get("supporting_engines", {}).get("engines", {})

            print(f"[PASS] {test['name']}")
            print(f"Score: {score}")
            print(f"Processing time: {processing_ms} ms")

            print("\nEngine Breakdown\n")

            if not engines:
                print("No engine data returned.")
            else:

                for engine_name, engine_output in engines.items():

                    print(f"----- {engine_name} -----")

                    try:
                        print(json.dumps(engine_output, indent=2))
                    except Exception:
                        print(engine_output)

                    print()

            print("-" * 60)

            results.append({
                "name": test["name"],
                "score": score,
                "processing_ms": processing_ms,
                "engines": engines
            })

        except Exception as e:

            print(f"[ERROR] {test['name']} -> {str(e)}")
            print("-" * 60)

    save_results(results)


def save_results(results):

    os.makedirs("validation_runs", exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")

    filepath = f"validation_runs/financial_validation_{timestamp}.json"

    output = {
        "timestamp": datetime.utcnow().isoformat(),
        "tests": results
    }

    with open(filepath, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nValidation results saved → {filepath}")


if __name__ == "__main__":
    run_tests()