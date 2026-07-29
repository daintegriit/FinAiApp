"""
Shared fixtures.

Runs against a throwaway database, NOT your development or production
one — every test truncates tables. Set TEST_DATABASE_URL to a scratch
Postgres instance; the suite refuses to run without it.
"""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

if not TEST_DATABASE_URL:
    pytest.skip(
        "TEST_DATABASE_URL not set. Point it at a scratch database — "
        "these tests destroy data.",
        allow_module_level=True,
    )

# Must be set before app import: main.py hard-fails on the dev secret
# when ENV looks like production.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ.setdefault("ENV", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-for-production")

from app.auth.jwt_handler import create_access_token, create_refresh_token  # noqa: E402
from app.auth.password_utils import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(autouse=True)
def _clean(db):
    """Wipe between tests so ordering never matters."""
    yield
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()


@pytest.fixture
def client(db):
    def _override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _make_user(db, *, email: str, is_admin: bool = False, is_active: bool = True):
    user = User(
        id=uuid.uuid4(),
        email=email,
        username=email.split("@")[0],
        password_hash=hash_password("correct-horse-battery"),
        is_active=is_active,
        is_admin=is_admin,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def alice(db):
    return _make_user(db, email="alice@example.com")


@pytest.fixture
def bob(db):
    """Second user. Every ownership test needs someone to attack."""
    return _make_user(db, email="bob@example.com")


@pytest.fixture
def admin_user(db):
    return _make_user(db, email="admin@example.com", is_admin=True)


@pytest.fixture
def banned_user(db):
    return _make_user(db, email="banned@example.com", is_active=False)


def auth_header(user) -> dict:
    return {"Authorization": f"Bearer {create_access_token(subject=str(user.id))}"}


@pytest.fixture
def alice_headers(alice):
    return auth_header(alice)


@pytest.fixture
def bob_headers(bob):
    return auth_header(bob)


@pytest.fixture
def admin_headers(admin_user):
    return auth_header(admin_user)


@pytest.fixture
def refresh_token_for():
    return lambda user: create_refresh_token(subject=str(user.id))