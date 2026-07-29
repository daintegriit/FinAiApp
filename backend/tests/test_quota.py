"""
LAYER 2 — quota metering.

Covers the cases that make a paywall real rather than decorative:
the limit actually stops requests, the two AI endpoints share one
pool, failures refund, and concurrent calls can't race past the cap.
"""
from __future__ import annotations

import threading
from unittest.mock import MagicMock, patch

import pytest

from app.auth.dependencies import (
    FREE_MONTHLY_SIMULATIONS,
    METERED_FEATURE,
    consume_quota,
    get_quota_state,
)
from app.models.usage import UsageCounter, current_period


SIM_PAYLOAD = {
    "name": "Test sim",
    "amount": 500,
    "term": 36,
    "category": "vehicle",
    "result": {"global_financial_score": 70, "engines": {}},
}


@pytest.fixture
def fake_anthropic():
    """
    Stub the Anthropic client. Tests must never make a real API call —
    slow, costly, and non-deterministic.
    """
    message = MagicMock()
    message.content = [MagicMock(text="A generated narrative.")]

    client = MagicMock()
    client.messages.create.return_value = message

    with patch(
        "app.routes.simulations._get_anthropic_client", return_value=client
    ), patch("app.routes.ai._get_anthropic_client", return_value=client):
        yield client


# --------------------------------------------------
# Basic accounting
# --------------------------------------------------

def test_quota_starts_full(client, alice_headers):
    response = client.get("/api/simulations/quota", headers=alice_headers)
    assert response.status_code == 200

    body = response.json()
    assert body["limit"] == FREE_MONTHLY_SIMULATIONS
    assert body["used"] == 0
    assert body["remaining"] == FREE_MONTHLY_SIMULATIONS
    assert body["unlimited"] is False


def test_each_simulation_decrements(client, alice_headers, fake_anthropic):
    for i in range(3):
        created = client.post(
            "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
        )
        assert created.status_code == 201

        remaining = client.get(
            "/api/simulations/quota", headers=alice_headers
        ).json()["remaining"]

        assert remaining == FREE_MONTHLY_SIMULATIONS - (i + 1)


def test_limit_blocks_with_402(client, alice_headers, fake_anthropic):
    for _ in range(FREE_MONTHLY_SIMULATIONS):
        assert (
            client.post(
                "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
            ).status_code
            == 201
        )

    blocked = client.post(
        "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
    )

    assert blocked.status_code == 402

    detail = blocked.json()["detail"]
    assert detail["error"] == "quota_exceeded"
    assert detail["remaining"] == 0
    assert detail["limit"] == FREE_MONTHLY_SIMULATIONS
    assert "period" in detail


def test_no_ai_call_once_exhausted(client, alice_headers, fake_anthropic):
    """
    The whole point of metering before the spend. Once blocked, the
    Anthropic client must not be touched again.
    """
    for _ in range(FREE_MONTHLY_SIMULATIONS):
        client.post("/api/simulations", json=SIM_PAYLOAD, headers=alice_headers)

    calls_before = fake_anthropic.messages.create.call_count

    client.post("/api/simulations", json=SIM_PAYLOAD, headers=alice_headers)

    assert fake_anthropic.messages.create.call_count == calls_before


# --------------------------------------------------
# Isolation
# --------------------------------------------------

def test_quota_is_per_user(client, alice_headers, bob_headers, fake_anthropic):
    for _ in range(FREE_MONTHLY_SIMULATIONS):
        client.post("/api/simulations", json=SIM_PAYLOAD, headers=alice_headers)

    assert (
        client.post(
            "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
        ).status_code
        == 402
    )

    assert (
        client.post(
            "/api/simulations", json=SIM_PAYLOAD, headers=bob_headers
        ).status_code
        == 201
    )


# --------------------------------------------------
# Shared pool
# --------------------------------------------------

def test_narrate_shares_the_simulation_pool(
    client, alice_headers, fake_anthropic
):
    """
    /ai/narrate is the same prompt against the same model. Metering
    one endpoint while leaving the other open would just relocate the
    free lunch.
    """
    narrate_payload = {
        "score": 70,
        "risk_level": "moderate",
        "drift_band": "stable",
        "drift_score": 10,
        "income_share": 0.2,
        "cashflow_share": 0.3,
        "future_value_if_invested": 50000,
        "median_wealth": 100000,
        "savings_rate": 0.15,
        "amount": 500,
        "category": "vehicle",
    }

    for _ in range(FREE_MONTHLY_SIMULATIONS):
        assert (
            client.post(
                "/api/ai/narrate", json=narrate_payload, headers=alice_headers
            ).status_code
            == 200
        )

    # Pool exhausted via narrate — simulations must also be blocked.
    assert (
        client.post(
            "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
        ).status_code
        == 402
    )


def test_categorize_is_not_metered(client, alice_headers, fake_anthropic):
    """Bookkeeping is core, not premium, and it's cache-backed."""
    fake_anthropic.messages.create.return_value.content = [
        MagicMock(
            text='{"category": "Food", "confidence": 0.9, "reasoning": "x"}'
        )
    ]

    for i in range(FREE_MONTHLY_SIMULATIONS + 3):
        response = client.post(
            "/api/ai/categorize",
            json={"merchant": f"Merchant {i}"},
            headers=alice_headers,
        )
        assert response.status_code == 200

    assert (
        client.get("/api/simulations/quota", headers=alice_headers).json()["used"]
        == 0
    )


# --------------------------------------------------
# Refunds
# --------------------------------------------------

def test_failed_persist_refunds(client, db, alice, alice_headers, fake_anthropic):
    """A user who got nothing must not be charged."""
    before = get_quota_state(db, alice)["used"]

    with patch(
        "app.routes.simulations.Simulation",
        side_effect=RuntimeError("db exploded"),
    ):
        response = client.post(
            "/api/simulations", json=SIM_PAYLOAD, headers=alice_headers
        )

    assert response.status_code == 500

    db.expire_all()
    assert get_quota_state(db, alice)["used"] == before


def test_narrate_failure_refunds(client, db, alice, alice_headers):
    failing = MagicMock()
    failing.messages.create.side_effect = RuntimeError("API down")

    with patch("app.routes.ai._get_anthropic_client", return_value=failing):
        response = client.post(
            "/api/ai/narrate",
            json={
                "score": 70,
                "risk_level": "moderate",
                "drift_band": "stable",
                "drift_score": 10,
                "income_share": 0.2,
                "cashflow_share": 0.3,
                "future_value_if_invested": 50000,
                "median_wealth": 100000,
                "savings_rate": 0.15,
                "amount": 500,
                "category": "vehicle",
            },
            headers=alice_headers,
        )

    # Returns a deterministic fallback rather than an error.
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"

    db.expire_all()
    assert get_quota_state(db, alice)["used"] == 0


# --------------------------------------------------
# Entitlement
# --------------------------------------------------

def test_admins_are_unlimited(client, db, admin_user, admin_headers, fake_anthropic):
    for _ in range(FREE_MONTHLY_SIMULATIONS + 2):
        assert (
            client.post(
                "/api/simulations", json=SIM_PAYLOAD, headers=admin_headers
            ).status_code
            == 201
        )

    assert get_quota_state(db, admin_user)["unlimited"] is True


def test_active_subscriber_is_unlimited(db, alice):
    if not hasattr(alice, "subscription_status"):
        pytest.skip("subscription_status column not migrated yet")

    alice.subscription_status = "active"
    db.commit()

    state = get_quota_state(db, alice)
    assert state["unlimited"] is True
    assert state["remaining"] is None


# --------------------------------------------------
# Period rollover
# --------------------------------------------------

def test_previous_month_does_not_count(db, alice):
    db.add(
        UsageCounter(
            user_id=alice.id,
            period="2020-01",
            feature=METERED_FEATURE,
            count=FREE_MONTHLY_SIMULATIONS,
        )
    )
    db.commit()

    state = get_quota_state(db, alice)
    assert state["used"] == 0
    assert state["remaining"] == FREE_MONTHLY_SIMULATIONS
    assert state["period"] == current_period()


# --------------------------------------------------
# Concurrency
# --------------------------------------------------

@pytest.mark.skipif(
    "sqlite" in str(pytest.importorskip("os").getenv("TEST_DATABASE_URL", "")),
    reason="SELECT ... FOR UPDATE requires Postgres",
)
def test_concurrent_requests_cannot_exceed_limit(alice):
    """
    Without a row lock, N simultaneous requests all read the same
    count and all write count+1 — every one of them succeeds and the
    limit means nothing. This is the test that catches a missing
    with_for_update().
    """
    import os

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(
        os.environ["TEST_DATABASE_URL"], pool_size=20, max_overflow=10
    )
    Session = sessionmaker(bind=engine)

    successes = []
    failures = []
    barrier = threading.Barrier(10)

    def attempt():
        session = Session()
        try:
            barrier.wait(timeout=10)  # maximise contention
            user = session.merge(alice)
            consume_quota(session, user)
            successes.append(1)
        except Exception:
            failures.append(1)
        finally:
            session.close()

    threads = [threading.Thread(target=attempt) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    assert len(successes) == FREE_MONTHLY_SIMULATIONS, (
        f"{len(successes)} of 10 concurrent requests succeeded; expected "
        f"exactly {FREE_MONTHLY_SIMULATIONS}. More means the increment "
        f"is racing."
    )
    assert len(failures) == 10 - FREE_MONTHLY_SIMULATIONS