from __future__ import annotations

import json
import time
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple

from fastapi.testclient import TestClient

from app.main import app


# --------------------------------------------------
# FastAPI Test Client
# --------------------------------------------------

client = TestClient(app)

API_ENDPOINT = "/api/financial/analyze"


# --------------------------------------------------
# Debug: Print Available Routes
# --------------------------------------------------

print("\nAvailable API Routes:")
for route in app.routes:
    print(route.path)


# --------------------------------------------------
# Regions for Global Testing
# --------------------------------------------------

REGIONS: List[Tuple[str, str]] = [
    ("US", "USD"),
    ("GB", "GBP"),
    ("CA", "CAD"),
    ("DE", "EUR"),
    ("FR", "EUR"),
    ("JP", "JPY"),
    ("AU", "AUD"),
]


# --------------------------------------------------
# Allowed Enum Guards
# --------------------------------------------------

VALID_PURCHASE_CATEGORIES = {
    "housing",
    "vehicle",
    "education",
    "business",
    "experience",
    "other",
}

VALID_LIFESTYLE_PRIORITIES = {
    "family",
    "mobility",
    "personal",
    "wealth",
    "status",
    "stability",
    "flexibility",
    "other",
}


def validate_payload(payload: Dict[str, Any]) -> None:
    category = payload.get("purchase_category")
    if category not in VALID_PURCHASE_CATEGORIES:
        raise ValueError(
            f"Invalid purchase_category '{category}'. "
            f"Must be one of {sorted(VALID_PURCHASE_CATEGORIES)}"
        )

    lifestyle_priority = payload.get("lifestyle_priority")
    if lifestyle_priority is not None and lifestyle_priority not in VALID_LIFESTYLE_PRIORITIES:
        raise ValueError(
            f"Invalid lifestyle_priority '{lifestyle_priority}'. "
            f"Must be one of {sorted(VALID_LIFESTYLE_PRIORITIES)}"
        )

    monthly_payment = payload.get("monthly_payment")
    term_months = payload.get("term_months")

    if monthly_payment is None or monthly_payment <= 0:
        raise ValueError("monthly_payment must be > 0")

    if term_months is None or term_months <= 0:
        raise ValueError("term_months must be > 0")


# --------------------------------------------------
# Scenario Builders
# --------------------------------------------------

def baseline_household(region: str, currency: str) -> Dict[str, Any]:
    payload = {
        "currency": currency,
        "region": region,
        "monthly_payment": 750,
        "term_months": 36,
        "net_monthly_income": 7500,
        "current_free_cashflow": 900,
        "annual_return_assumption": 0.07,
        "annual_inflation_assumption": 0.02,
        "purchase_category": "housing",
        "lifestyle_priority": "family",
        "family_value": 9,
        "personal_satisfaction": 8,
        "goal_cost": 250000,
        "goal_monthly_contribution": 500,
    }
    validate_payload(payload)
    return payload


def overleveraged_household(region: str, currency: str) -> Dict[str, Any]:
    payload = {
        "currency": currency,
        "region": region,
        "monthly_payment": 3200,
        "term_months": 72,
        "net_monthly_income": 4200,
        "current_free_cashflow": 150,
        "annual_return_assumption": 0.07,
        "annual_inflation_assumption": 0.02,
        "purchase_category": "vehicle",
        "lifestyle_priority": "personal",
        "family_value": 3,
        "personal_satisfaction": 9,
        "goal_cost": 250000,
        "goal_monthly_contribution": 200,
    }
    validate_payload(payload)
    return payload


def wealth_builder(region: str, currency: str) -> Dict[str, Any]:
    payload = {
        "currency": currency,
        "region": region,
        "monthly_payment": 1,
        "term_months": 12,
        "net_monthly_income": 12000,
        "current_free_cashflow": 5000,
        "annual_return_assumption": 0.07,
        "annual_inflation_assumption": 0.02,
        "purchase_category": "experience",
        "lifestyle_priority": "wealth",
        "family_value": 6,
        "personal_satisfaction": 7,
        "goal_cost": 500000,
        "goal_monthly_contribution": 2500,
    }
    validate_payload(payload)
    return payload


SCENARIOS: Dict[str, Callable[[str, str], Dict[str, Any]]] = {
    "Baseline Household": baseline_household,
    "Overleveraged Scenario": overleveraged_household,
    "Wealth Builder": wealth_builder,
}


# --------------------------------------------------
# Health + Diagnostics
# --------------------------------------------------

def evaluate_engine_health(result: Dict[str, Any]) -> Dict[str, Any]:
    engines = result.get("engines", {})
    failures: List[str] = []
    failed_engine_details: Dict[str, Any] = {}

    for engine_name, engine_output in engines.items():
        if isinstance(engine_output, dict) and engine_output.get("engine_error"):
            failures.append(engine_name)
            failed_engine_details[engine_name] = engine_output

    return {
        "engine_count": len(engines),
        "failed_engines": failures,
        "failed_engine_details": failed_engine_details,
        "healthy": len(failures) == 0,
    }


def summarize_result_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    engines = data.get("engines", {})

    return {
        "global_financial_score": data.get("global_financial_score"),
        "processing_ms": data.get("processing_ms"),
        "engine_names": sorted(list(engines.keys())),
        "engine_count": len(engines),
        "has_explanation": "explanation" in data,
    }


# --------------------------------------------------
# Run Global Validation
# --------------------------------------------------

def run_global_validation() -> List[Dict[str, Any]]:
    print("\n==============================")
    print("Running Global Financial Engine Validation")
    print("==============================\n")

    results: List[Dict[str, Any]] = []

    for region, currency in REGIONS:
        print(f"\n--- Region: {region} ({currency}) ---")

        for scenario_name, scenario_fn in SCENARIOS.items():
            payload = scenario_fn(region, currency)
            start = time.perf_counter()

            try:
                response = client.post(API_ENDPOINT, json=payload)
            except Exception as e:
                duration_ms = int((time.perf_counter() - start) * 1000)

                print(f"[ERROR] {scenario_name}")
                print("Exception:", str(e))

                results.append(
                    {
                        "region": region,
                        "currency": currency,
                        "scenario": scenario_name,
                        "status": "exception",
                        "error": str(e),
                        "payload": payload,
                        "duration_ms": duration_ms,
                    }
                )
                continue

            duration_ms = int((time.perf_counter() - start) * 1000)

            if response.status_code != 200:
                print(f"[FAIL] {scenario_name}")
                print("HTTP Status:", response.status_code)

                error_body: Any
                try:
                    error_body = response.json()
                    print("Validation Error:", error_body)
                except Exception:
                    error_body = response.text
                    print("Response Text:", error_body)

                result = {
                    "region": region,
                    "currency": currency,
                    "scenario": scenario_name,
                    "status": "fail",
                    "http_status": response.status_code,
                    "payload": payload,
                    "duration_ms": duration_ms,
                    "error_response": error_body,
                }
                results.append(result)
                continue

            try:
                data = response.json()
            except Exception:
                print(f"[FAIL] {scenario_name}")
                print("Invalid JSON response")

                result = {
                    "region": region,
                    "currency": currency,
                    "scenario": scenario_name,
                    "status": "invalid_json",
                    "payload": payload,
                    "duration_ms": duration_ms,
                    "response_text": response.text,
                }
                results.append(result)
                continue

            health = evaluate_engine_health(data)
            status = "pass" if health["healthy"] else "engine_error"

            print(f"[{status.upper()}] {scenario_name}")

            if not health["healthy"]:
                for failed_engine in health["failed_engines"]:
                    print(f"   Failed Engine: {failed_engine}")
                    print(
                        "   Engine Output:",
                        health["failed_engine_details"].get(failed_engine),
                    )

            result = {
                "region": region,
                "currency": currency,
                "scenario": scenario_name,
                "status": status,
                "duration_ms": duration_ms,
                "payload": payload,
                "engine_health": health,
                "response_summary": summarize_result_payload(data),
                "result": data,
            }
            results.append(result)

    return results


# --------------------------------------------------
# Save Results
# --------------------------------------------------

def save_results(results: List[Dict[str, Any]]) -> None:
    output_dir = Path("validation_runs")
    output_dir.mkdir(exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y-%m-%d_%H-%M-%S")
    output_file = output_dir / f"global_validation_{timestamp}.json"

    passed = [r for r in results if r["status"] == "pass"]
    engine_errors = [r for r in results if r["status"] == "engine_error"]
    failed_http = [r for r in results if r["status"] == "fail"]
    invalid_json = [r for r in results if r["status"] == "invalid_json"]
    exceptions = [r for r in results if r["status"] == "exception"]

    failed_engine_frequency: Dict[str, int] = {}
    for item in engine_errors:
        health = item.get("engine_health", {})
        for engine_name in health.get("failed_engines", []):
            failed_engine_frequency[engine_name] = (
                failed_engine_frequency.get(engine_name, 0) + 1
            )

    summary = {
        "total_tests": len(results),
        "passed": len(passed),
        "engine_errors": len(engine_errors),
        "http_failures": len(failed_http),
        "invalid_json": len(invalid_json),
        "exceptions": len(exceptions),
        "failed": len(results) - len(passed),
        "pass_rate": round((len(passed) / len(results)) * 100, 2) if results else 0.0,
        "regions_tested": sorted(list({r["region"] for r in results})),
        "scenario_count_per_region": len(SCENARIOS),
        "failed_engine_frequency": failed_engine_frequency,
    }

    with output_file.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "timestamp": datetime.now(UTC).isoformat(),
                "api_endpoint": API_ENDPOINT,
                "summary": summary,
                "tests": results,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    print("\nValidation results saved →", output_file)
    print("Summary:", summary)


# --------------------------------------------------
# Entry Point
# --------------------------------------------------

if __name__ == "__main__":
    results = run_global_validation()
    save_results(results)