"""
LAYER 3 — object-level ownership.

Authentication is not authorization. Each test has Bob, holding a
perfectly valid token, reach for something belonging to Alice. Every
one of these was exploitable before the rewrite.

Expected result is 404, not 403: "that exists but isn't yours"
confirms the ID is real.
"""
from __future__ import annotations

import uuid

import pytest

from app.models.categories import Category
from app.models.simulation import Simulation
from app.models.transactions import Transaction


# --------------------------------------------------
# Fixtures
# --------------------------------------------------

@pytest.fixture
def alice_transaction(db, alice):
    tx = Transaction(
        user_id=alice.id,
        category="Food",
        merchant="Alice's Grocer",
        amount=42.50,
        is_recurring=False,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@pytest.fixture
def alice_category(db, alice):
    cat = Category(
        id=uuid.uuid4(),
        user_id=alice.id,
        name="Alice Budget",
        budget=500,
        spent=0,
        is_default=False,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture
def alice_simulation(db, alice):
    sim = Simulation(
        id=uuid.uuid4(),
        user_id=alice.id,
        name="Alice's car loan",
        amount=450.0,
        term_months=60,
        category="vehicle",
        result={"global_financial_score": 72},
        narrative="private",
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return sim


# --------------------------------------------------
# Read isolation
# --------------------------------------------------

def test_list_transactions_shows_only_own(
    client, bob_headers, alice_transaction
):
    response = client.get("/api/transactions", headers=bob_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_categories_shows_only_own(client, bob_headers, alice_category):
    response = client.get("/api/categories", headers=bob_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_list_simulations_shows_only_own(
    client, bob_headers, alice_simulation
):
    response = client.get("/api/simulations", headers=bob_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_alice_sees_her_own_simulation(client, alice_headers, alice_simulation):
    """Isolation must not be achieved by breaking the feature."""
    response = client.get("/api/simulations", headers=alice_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Alice's car loan"


# --------------------------------------------------
# Write / delete isolation
# --------------------------------------------------

def test_cannot_delete_others_transaction(
    client, db, bob_headers, alice_transaction
):
    response = client.delete(
        f"/api/transactions/{alice_transaction.id}", headers=bob_headers
    )
    assert response.status_code == 404

    surviving = (
        db.query(Transaction)
        .filter(Transaction.id == alice_transaction.id)
        .first()
    )
    assert surviving is not None, "Bob deleted Alice's transaction"


def test_cannot_delete_others_category(
    client, db, bob_headers, alice_category
):
    response = client.delete(
        f"/api/categories/{alice_category.id}", headers=bob_headers
    )
    assert response.status_code == 404
    assert (
        db.query(Category).filter(Category.id == alice_category.id).first()
        is not None
    )


def test_cannot_patch_others_category(
    client, db, bob_headers, alice_category
):
    response = client.patch(
        f"/api/categories/{alice_category.id}",
        json={"budget": 999999},
        headers=bob_headers,
    )
    assert response.status_code == 404

    db.refresh(alice_category)
    assert float(alice_category.budget) == 500


def test_cannot_delete_others_simulation(
    client, db, bob_headers, alice_simulation
):
    response = client.delete(
        f"/api/simulations/{alice_simulation.id}", headers=bob_headers
    )
    assert response.status_code == 404
    assert (
        db.query(Simulation)
        .filter(Simulation.id == alice_simulation.id)
        .first()
        is not None
    )


# --------------------------------------------------
# Identity cannot be asserted by the client
# --------------------------------------------------

def test_transaction_ignores_supplied_user_id(client, db, bob_headers, alice):
    """
    A body user_id must not override the token. This was the original
    bug: POST /transactions trusted whatever the caller sent.
    """
    response = client.post(
        "/api/transactions",
        json={
            "amount": 100,
            "category": "Food",
            "user_id": str(alice.id),
        },
        headers=bob_headers,
    )

    assert response.status_code in (201, 422)

    if response.status_code == 201:
        assert (
            db.query(Transaction)
            .filter(Transaction.user_id == alice.id)
            .count()
            == 0
        ), "Bob wrote a transaction into Alice's account"


def test_category_ignores_supplied_user_id(client, db, bob_headers, alice):
    response = client.post(
        "/api/categories",
        json={
            "name": "Injected",
            "budget": 100,
            "spent": 0,
            "is_default": False,
            "user_id": str(alice.id),
        },
        headers=bob_headers,
    )

    if response.status_code in (200, 201):
        assert (
            db.query(Category)
            .filter(
                Category.user_id == alice.id,
                Category.name == "Injected",
            )
            .count()
            == 0
        )


def test_simulation_ignores_supplied_user_id(client, db, bob_headers, alice):
    response = client.post(
        "/api/simulations",
        json={
            "name": "Injected",
            "amount": 100,
            "term": 12,
            "result": {},
            "user_id": str(alice.id),
        },
        headers=bob_headers,
    )

    if response.status_code in (200, 201):
        assert (
            db.query(Simulation)
            .filter(
                Simulation.user_id == alice.id,
                Simulation.name == "Injected",
            )
            .count()
            == 0
        )


# --------------------------------------------------
# Legacy profile alias
# --------------------------------------------------

def test_legacy_profile_path_ignores_supplied_id(client, bob_headers, alice):
    """
    GET /profile/{user_id} is kept for one release. It must serve the
    caller's own profile regardless of the ID in the path.
    """
    response = client.get(f"/api/profile/{alice.id}", headers=bob_headers)

    # 404 when Bob has no profile; never Alice's data.
    assert response.status_code in (200, 404)

    if response.status_code == 200:
        profile = response.json().get("profile", {})
        assert str(profile.get("user_id")) != str(alice.id)


# --------------------------------------------------
# Account deletion
# --------------------------------------------------

def test_delete_me_removes_only_caller(
    client, db, bob_headers, alice, alice_transaction
):
    from app.models.user import User

    response = client.delete("/api/auth/me", headers=bob_headers)
    assert response.status_code == 200

    assert db.query(User).filter(User.id == alice.id).first() is not None
    assert (
        db.query(Transaction)
        .filter(Transaction.id == alice_transaction.id)
        .first()
        is not None
    )


# --------------------------------------------------
# Admin
# --------------------------------------------------

def test_non_admin_blocked_from_admin_routes(client, alice_headers):
    for path in ("/api/admin/stats", "/api/admin/users", "/api/admin/export/users"):
        response = client.get(path, headers=alice_headers)
        assert response.status_code == 403, f"{path} allowed a non-admin"


def test_admin_allowed(client, admin_headers):
    response = client.get("/api/admin/stats", headers=admin_headers)
    assert response.status_code == 200


def test_admin_cannot_self_delete(client, admin_headers, admin_user):
    response = client.delete(
        f"/api/admin/users/{admin_user.id}", headers=admin_headers
    )
    assert response.status_code == 400