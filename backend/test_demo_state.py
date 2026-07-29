#!/usr/bin/env python3
"""
Diagnostic: dump the demo account's actual backend state so we can see
exactly what transactions and categories exist, and whether the numbers
make sense (vs. what the app displays).

Usage:
    python3 test_demo_state.py https://finai-backend-466323878357.us-east1.run.app
"""
import json, sys, urllib.request, urllib.error

EMAIL = "demo@finbudgetai.com"
PASSWORD = "FinBudget2026!"

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

    print("=" * 55)
    print("DEMO ACCOUNT BACKEND STATE")
    print("=" * 55)

    # Profile
    st, prof = req(f"{base}/api/profile", token=token)
    if st == 200 and prof.get("profile"):
        p = prof["profile"]
        print(f"\nPROFILE:")
        print(f"  monthly_income: {p.get('monthly_income')}")
        print(f"  savings: {p.get('savings_amount')}  debt: {p.get('debt_amount')}")
    else:
        print(f"\nPROFILE: {st} {prof}")

    # Transactions
    st, txs = req(f"{base}/api/transactions", token=token)
    print(f"\nTRANSACTIONS ({len(txs) if isinstance(txs, list) else '?'}):")
    total = 0
    by_cat = {}
    if isinstance(txs, list):
        for t in txs:
            amt = float(t.get("amount", 0))
            cat = t.get("category", "?")
            total += amt
            by_cat[cat] = by_cat.get(cat, 0) + amt
            print(f"  {cat:<16} ${amt:>8.2f}  recurring={t.get('is_recurring')}  id={t.get('id','')[:8]}")
    print(f"\n  TOTAL SPENDING: ${total:,.2f}")

    # Categories (with budgets)
    st, cats = req(f"{base}/api/categories?user_id=x", token=token)
    print(f"\nCATEGORIES / BUDGETS ({len(cats) if isinstance(cats, list) else '?'}):")
    if isinstance(cats, list):
        for c in cats:
            name = c.get("name", "?")
            budget = c.get("budget", 0)
            spent_here = by_cat.get(name, 0)
            status = "OVER" if spent_here > budget and budget > 0 else "ok"
            print(f"  {name:<16} budget=${budget:>7}  spent=${spent_here:>8.2f}  [{status}]")

    print("\n" + "=" * 55)
    print("DIAGNOSIS:")
    print("  Compare category NAMES in TRANSACTIONS vs CATEGORIES above.")
    print("  If a transaction's category has no matching budget category")
    print("  (or names differ), the dashboard can't map spending->budget")
    print("  correctly, causing wrong ring colors / 'over' states.")
    print("=" * 55)

if __name__ == "__main__":
    sys.exit(main())