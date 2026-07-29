#!/usr/bin/env python3
"""
Set clean category budgets on the demo account so every category is
comfortably UNDER budget (healthy green rings) for screenshots.

Matches the ACTUAL transaction categories that exist:
  Home $2100, Groceries $480, Transport $210, Health $130, Subscriptions $75

Usage:
    python3 fix_demo_budgets.py https://finai-backend-466323878357.us-east1.run.app
"""
import json, sys, urllib.request, urllib.error

EMAIL = "demo@finbudgetai.com"
PASSWORD = "FinBudget2026!"

# Budgets set ABOVE spending so everything shows healthy/under.
# icon names use Ionicons outline names the grid expects.
BUDGETS = [
    {"name": "Home",          "budget": 2500, "icon": "home-outline"},
    {"name": "Groceries",     "budget": 700,  "icon": "cart-outline"},
    {"name": "Transport",     "budget": 350,  "icon": "car-outline"},
    {"name": "Health",        "budget": 250,  "icon": "medkit-outline"},
    {"name": "Subscriptions", "budget": 150,  "icon": "card-outline"},
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
    base = sys.argv[1].rstrip("/")
    st, body = req(f"{base}/api/auth/login", "POST", {"email": EMAIL, "password": PASSWORD})
    token = body["access_token"]

    # Get existing categories to update vs create
    st, cats = req(f"{base}/api/categories?user_id=x", token=token)
    existing = {c["name"].strip().lower(): c for c in cats} if isinstance(cats, list) else {}

    for b in BUDGETS:
        key = b["name"].strip().lower()
        if key in existing:
            cid = existing[key]["id"]
            st, _ = req(f"{base}/api/categories/{cid}", "PATCH", {"budget": b["budget"]}, token=token)
            print(f"  updated {b['name']:<14} -> budget ${b['budget']}  ({st})")
        else:
            payload = {
                "user_id": "x",  # backend derives from token
                "name": b["name"],
                "icon": b["icon"],
                "budget": b["budget"],
                "spent": 0,
                "is_default": True,
            }
            st, _ = req(f"{base}/api/categories", "POST", payload, token=token)
            print(f"  created {b['name']:<14} -> budget ${b['budget']}  ({st})")

    print("\nDone. Log out/in on the app to load the budgets.")
    print("Spending vs budget (all should be UNDER):")
    print("  Home $2100/$2500  Groceries $480/$700  Transport $210/$350")
    print("  Health $130/$250  Subscriptions $75/$150")

if __name__ == "__main__":
    sys.exit(main())