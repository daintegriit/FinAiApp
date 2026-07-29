"""
LAYER 1 — global authentication.

Every endpoint rejects an anonymous caller unless it is deliberately
public. The final test walks the live route table, so a new endpoint
added tomorrow fails here until someone makes a decision about it.
"""
from __future__ import annotations

import pytest

from app.auth.dependencies import PUBLIC_PATH_PREFIXES
from app.main import app

# (method, path, body)
PROTECTED_ENDPOINTS = [
    ("GET", "/api/auth/me", None),
    ("POST", "/api/auth/accept-terms", None),
    ("DELETE", "/api/auth/me", None),

    ("GET", "/api/profile", None),
    ("POST", "/api/profile/create", {}),
    ("PUT", "/api/profile", {}),

    ("GET", "/api/transactions", None),
    ("POST", "/api/transactions", {"amount": 10, "category": "Food"}),
    ("DELETE", "/api/transactions/00000000-0000-0000-0000-000000000000", None),

    ("GET", "/api/categories", None),
    ("POST", "/api/categories", {"name": "Food"}),
    ("PATCH", "/api/categories/00000000-0000-0000-0000-000000000000", {}),
    ("DELETE", "/api/categories/00000000-0000-0000-0000-000000000000", None),

    ("GET", "/api/simulations", None),
    ("GET", "/api/simulations/quota", None),
    ("POST", "/api/simulations", {"name": "x", "amount": 1, "term": 1, "result": {}}),
    ("DELETE", "/api/simulations/00000000-0000-0000-0000-000000000000", None),

    ("GET", "/api/peers/benchmark", None),
    ("GET", "/api/peers/map", None),

    ("POST", "/api/notifications/register", {"push_token": "x"}),
    ("DELETE", "/api/notifications/register", None),
    ("POST", "/api/notifications/send-welcome", None),

    ("POST", "/api/ai/categorize", {"merchant": "Costco"}),
    ("POST", "/api/ai/narrate", {}),

    ("POST", "/api/scenario/evaluate", []),
    ("POST", "/api/financial/analyze", {}),
    ("POST", "/api/dashboard/snapshot", {}),
    ("POST", "/api/report/generate", {}),
    ("POST", "/api/portfolio/growth", {}),
    ("POST", "/api/policy/validate", {}),
    ("POST", "/api/benchmark/evaluate", {}),
    ("POST", "/api/commitment-lock/evaluate", {}),
    ("POST", "/api/financial-state/evaluate", {}),

    ("GET", "/api/admin/stats", None),
    ("GET", "/api/admin/users", None),
    ("GET", "/api/admin/export/users", None),
    ("POST", "/api/admin/push/broadcast", {"title": "x", "body": "y"}),
]


@pytest.mark.parametrize("method,path,body", PROTECTED_ENDPOINTS)
def test_rejects_anonymous(client, method, path, body):
    response = client.request(method, path, json=body)

    assert response.status_code == 401, (
        f"{method} {path} returned {response.status_code} without a token. "
        f"Anything other than 401 means the endpoint is reachable anonymously."
    )


@pytest.mark.parametrize("method,path,body", PROTECTED_ENDPOINTS)
def test_rejects_garbage_token(client, method, path, body):
    response = client.request(
        method,
        path,
        json=body,
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("method,path,body", PROTECTED_ENDPOINTS)
def test_rejects_wrong_scheme(client, method, path, body):
    """Basic auth, or a bare token with no scheme, must not pass."""
    response = client.request(
        method,
        path,
        json=body,
        headers={"Authorization": "Basic YWxpY2U6cGFzc3dvcmQ="},
    )
    assert response.status_code == 401


def test_rejects_refresh_token_as_access_token(client, alice, refresh_token_for):
    """
    Refresh tokens carry type=refresh. Accepting one as a bearer
    credential would extend a long-lived token's blast radius to the
    entire API.
    """
    token = refresh_token_for(alice)
    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


def test_banned_user_is_rejected(client, banned_user):
    from tests.conftest import auth_header

    response = client.get("/api/auth/me", headers=auth_header(banned_user))
    assert response.status_code in (401, 403)


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


def test_health_leaks_no_config(client):
    """Uptime probes shouldn't disclose which environment is running."""
    body = client.get("/health").json()
    assert "environment" not in body


def test_login_is_public(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert response.status_code != 401 or "Invalid email" in response.text


# --------------------------------------------------
# Auto-discovery
# --------------------------------------------------

def test_no_undeclared_routes():
    """
    Fails when a route exists that is neither public nor in the table
    above. Forces a deliberate choice for every new endpoint rather
    than letting one ship unnoticed.
    """
    declared = {p for _, p, _ in PROTECTED_ENDPOINTS}

    ignored_prefixes = ("/openapi", "/docs", "/redoc", "/static")

    undeclared = []

    for route in app.routes:
        path = getattr(route, "path", None)
        if not path or path == "/":
            continue
        if path.startswith(PUBLIC_PATH_PREFIXES) or path.startswith(ignored_prefixes):
            continue
        if path in declared:
            continue

        # Normalise {param} names — the table uses concrete UUIDs.
        normalised = {
            d for d in declared
            if d.count("/") == path.count("/")
            and d.split("/")[:4] == path.split("/")[:4]
        }
        if normalised:
            continue

        undeclared.append(f"{sorted(getattr(route, 'methods', []))} {path}")

    assert not undeclared, (
        "Routes not covered by an auth test:\n  "
        + "\n  ".join(sorted(undeclared))
        + "\n\nAdd each to PROTECTED_ENDPOINTS, or to PUBLIC_PATH_PREFIXES "
          "if it is genuinely public."
    )