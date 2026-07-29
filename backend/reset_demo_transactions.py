#!/usr/bin/env python3
"""
Wipe all transactions for the demo account on the backend, then
optionally add a clean, controlled set for screenshots where every
category is comfortably UNDER budget (healthy green rings).

Usage:
    python3 reset_demo_transactions.py https://finai-backend-466323878357.us-east1.run.app
"""
import json, sys, urllib.request, urllib.error

EMAIL = "demo@finbudgetai.com"
PASSWORD = "FinBudget2026!"

# Clean, controlled spending — each UNDER its budget for a healthy look.
# (Set these category budgets in-app: Home 2300, Groceries 700, Transport 300,
#  Health 200, Subscriptions 100)
CLEAN_TX = [
    {"amount": 2100, "category": "Home",          "merchant": "Rent",              "is_recurring": True,  "recurring_term_months": 12},
    {"amount": 480,  "category": "Groceries",     "merchant": "Whole Foods",       "is_recurring": False},
    {"amount": 210,  "category": "Transport",     "merchant": "Gas & Transit",     "is_recurring": False},
    {"amount": 130,  "category": "Health",        "merchant": "Gym",               "is_recurring": False},
    {"amount": 75,   "category": "Subscriptions", "merchant": "Streaming",         "is_recurring": True,  "recurring_term_months": 12},
]

def req(url, method="GET", body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    if len(sys.argv) < 2:
        print("usage: reset_demo_transactions.py <base-url>"); return 2
    base = sys.argv[1].rstrip("/")

    print("Logging in...")
    st, body = req(f"{base}/api/auth/login", "POST", {"email": EMAIL, "password": PASSWORD})
    if st != 200:
        print("  login failed:", st, body); return 1
    token = body["access_token"]

    print("Fetching existing transactions...")
    st, txs = req(f"{base}/api/transactions", "GET", token=token)
    if st != 200:
        print("  fetch failed:", st, txs); return 1
    print(f"  found {len(txs)} transactions")

    print("Deleting all...")
    deleted = 0
    for tx in txs:
        tid = tx.get("id")
        if not tid: continue
        st, _ = req(f"{base}/api/transactions/{tid}", "DELETE", token=token)
        if st in (200, 204): deleted += 1
    print(f"  deleted {deleted}")

    if "--clean" in sys.argv:
        print("Adding clean controlled set...")
        added = 0
        for tx in CLEAN_TX:
            st, _ = req(f"{base}/api/transactions", "POST", tx, token=token)
            if st in (200, 201): added += 1
        print(f"  added {added}/{len(CLEAN_TX)}")

    print("\nDone. Reload the app (log out/in) to see the clean slate.")
    return 0

if __name__ == "__main__":
    sys.exit(main())