#!/usr/bin/env python3
"""
Create a screenshot-ready / reviewer demo account against the live API.

Registers a user, logs in, and creates a rich financial profile with
aspirational-but-realistic numbers that produce a strong financial
score and full-looking dashboard.

Usage:
    python3 scripts/create_demo_account.py https://finai-backend-466323878357.us-east1.run.app

The credentials printed at the end are what you log in with in the
simulator (for screenshots) AND what you give Apple's reviewer.
"""
import json
import sys
import urllib.request
import urllib.error

# ---- Demo account credentials (change if you like) ----
EMAIL = "demo@finbudgetai.com"
USERNAME = "demo"
PASSWORD = "FinBudget2026!"

# ---- Rich profile: tuned for a strong score + full dashboard ----
PROFILE = {
    "country": "US",
    "timezone": "America/Chicago",
    "age": 32,
    "employment_type": "full_time",
    "monthly_income": 8500,
    "risk_tolerance": "moderate",
    "investment_experience": "intermediate",
    "financial_goal": "grow_investments",
    "lifestyle": "balanced",
    "income_stability": "very_stable",
    "savings_amount": 42000,      # healthy
    "debt_amount": 6500,          # low
    "emergency_fund_months": 6,   # strong
    "city": "Austin",
    "state": "TX",
    "zip_code": "78701",
    "latitude": 30.2672,
    "longitude": -97.7431,
}


def post(url, payload, token=None):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    if len(sys.argv) < 2:
        print("usage: create_demo_account.py <base-url>")
        return 2
    base = sys.argv[1].rstrip("/")

    print("1. Registering demo account...")
    status, body = post(f"{base}/api/auth/register", {
        "email": EMAIL, "username": USERNAME, "password": PASSWORD,
    })
    if status == 200 or status == 201:
        print(f"   created: {EMAIL}")
    elif status == 400 and "already" in str(body).lower():
        print(f"   already exists — continuing to log in")
    else:
        print(f"   register returned {status}: {body}")

    print("2. Logging in...")
    status, body = post(f"{base}/api/auth/login", {
        "email": EMAIL, "password": PASSWORD,
    })
    if status != 200:
        print(f"   login failed {status}: {body}")
        return 1
    token = body["access_token"]
    print("   got token")

    print("3. Creating financial profile...")
    status, body = post(f"{base}/api/profile/create", PROFILE, token=token)
    if status in (200, 201):
        print("   profile created")
    elif status == 409 or (status == 400 and "exists" in str(body).lower()):
        print("   profile already exists — updating instead")
        # try PUT
        data = json.dumps(PROFILE).encode()
        req = urllib.request.Request(f"{base}/api/profile", data=data, method="PUT")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                print(f"   profile updated ({r.status})")
        except urllib.error.HTTPError as e:
            print(f"   update returned {e.code}: {e.read().decode()[:200]}")
    else:
        print(f"   profile create returned {status}: {str(body)[:300]}")


    print("4. Adding sample transactions...")
    transactions = [
        {"amount": 2100, "category": "Housing", "merchant": "Apartment Rent", "is_recurring": True, "recurring_term_months": 12},
        {"amount": 620, "category": "Groceries", "merchant": "Whole Foods", "is_recurring": False},
        {"amount": 340, "category": "Dining", "merchant": "Restaurants", "is_recurring": False},
        {"amount": 190, "category": "Utilities", "merchant": "Electric & Water", "is_recurring": True, "recurring_term_months": 12},
        {"amount": 95, "category": "Transport", "merchant": "Gas & Transit", "is_recurring": False},
        {"amount": 55, "category": "Subscriptions", "merchant": "Streaming & Apps", "is_recurring": True, "recurring_term_months": 12},
        {"amount": 130, "category": "Health", "merchant": "Gym & Pharmacy", "is_recurring": False},
        {"amount": 210, "category": "Shopping", "merchant": "Retail", "is_recurring": False},
    ]
    created = 0
    for tx in transactions:
        status, body = post(f"{base}/api/transactions", tx, token=token)
        if status in (200, 201):
            created += 1
    print(f"   created {created}/{len(transactions)} transactions")

    print("\n" + "=" * 50)
    print("DEMO ACCOUNT READY")
    print("=" * 50)
    print(f"  Email:    {EMAIL}")
    print(f"  Password: {PASSWORD}")
    print("\nLog in with these in the simulator to take screenshots,")
    print("and give the same credentials to Apple's reviewer.")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())