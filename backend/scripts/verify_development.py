#!/usr/bin/env python3
"""
Post-deploy smoke check.

Probes a RUNNING deployment for endpoints reachable without a token.
Complements the pytest suite: that tests the code, this tests what is
actually serving traffic — including stale revisions, misrouted
traffic splits, and anything bypassing the app.

    python3 verify_deployment.py https://your-backend.run.app

Exit code 0 = clean, 1 = at least one endpoint answered anonymously.

Read-only: no DELETE or PUT probes, and POSTs carry payloads that fail
validation before touching data. Safe against production.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

GREEN, RED, YELLOW, DIM, RESET = (
    "\033[92m", "\033[91m", "\033[93m", "\033[2m", "\033[0m"
)

# (method, path, body, expectation)
#   "auth"   -> must reject anonymous access
#   "public" -> must respond without a token
PROBES = [
    ("GET", "/api/users/", None, "auth"),
    ("GET", "/api/users", None, "auth"),
    ("GET", "/api/auth/me", None, "auth"),
    ("GET", "/api/profile", None, "auth"),
    ("GET", "/api/profile/00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/transactions", None, "auth"),
    ("GET", "/api/transactions?user_id=00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/categories", None, "auth"),
    ("GET", "/api/categories?user_id=00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/simulations", None, "auth"),
    ("GET", "/api/simulations/00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/simulations/quota", None, "auth"),
    ("GET", "/api/peers/benchmark?user_id=00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/peers/map?user_id=00000000-0000-0000-0000-000000000000", None, "auth"),
    ("GET", "/api/admin/stats", None, "auth"),
    ("GET", "/api/admin/users", None, "auth"),
    ("GET", "/api/admin/export/users", None, "auth"),
    ("POST", "/api/ai/narrate", {}, "auth"),
    ("POST", "/api/ai/categorize", {"merchant": "probe"}, "auth"),
    ("POST", "/api/simulations", {}, "auth"),
    ("POST", "/api/financial/analyze", {}, "auth"),
    ("POST", "/api/scenario/evaluate", [], "auth"),
    ("POST", "/api/dashboard/snapshot", {}, "auth"),
    ("POST", "/api/report/generate", {}, "auth"),
    ("POST", "/api/notifications/register", {}, "auth"),
    ("POST", "/api/notifications/send-welcome", None, "auth"),
    ("GET", "/health", None, "public"),
    ("POST", "/api/auth/login", {"email": "probe@invalid", "password": "x"}, "public"),
]

DOCS_PATHS = ["/docs", "/redoc", "/openapi.json"]


def probe(base: str, method: str, path: str, body) -> int:
    url = base.rstrip("/") + path
    data = json.dumps(body).encode() if body is not None else None

    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify_deployment.py <base-url>")
        return 2

    base = sys.argv[1]
    print(f"\nProbing {base}\n" + "=" * 60)

    failures = []
    warnings = []

    for method, path, body, expectation in PROBES:
        status = probe(base, method, path, body)
        label = f"{method:6} {path[:52]:<52}"

        if expectation == "auth":
            if status in (401, 403):
                print(f"{GREEN}PASS{RESET} {label} {DIM}{status}{RESET}")
            elif status == 404:
                print(f"{DIM}n/a {RESET} {label} {DIM}404 (route absent){RESET}")
            elif status == 0:
                print(f"{YELLOW}WARN{RESET} {label} {DIM}unreachable{RESET}")
                warnings.append(path)
            else:
                print(f"{RED}FAIL{RESET} {label} {RED}{status} — no auth!{RESET}")
                failures.append(f"{method} {path} -> {status}")
        else:
            if status in (200, 400, 401, 422):
                print(f"{GREEN}PASS{RESET} {label} {DIM}{status}{RESET}")
            else:
                print(f"{YELLOW}WARN{RESET} {label} {DIM}{status}{RESET}")
                warnings.append(path)

    print("-" * 60)

    for path in DOCS_PATHS:
        status = probe(base, "GET", path, None)
        if status == 200:
            print(f"{RED}FAIL{RESET} {'GET':6} {path:<52} {RED}200 — docs public{RESET}")
            failures.append(f"GET {path} -> 200 (API surface exposed)")
        else:
            print(f"{GREEN}PASS{RESET} {'GET':6} {path:<52} {DIM}{status}{RESET}")

    print("=" * 60)

    if failures:
        print(f"\n{RED}{len(failures)} endpoint(s) reachable without authentication:{RESET}")
        for f in failures:
            print(f"  - {f}")
        print()
        return 1

    print(f"\n{GREEN}No unauthenticated access detected.{RESET}")
    if warnings:
        print(f"{YELLOW}{len(warnings)} warning(s) — check manually.{RESET}")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())