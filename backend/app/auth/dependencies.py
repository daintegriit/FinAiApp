from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.usage import UsageCounter, current_period
from app.auth.jwt_handler import ensure_access_token

logger = logging.getLogger(__name__)


# --------------------------------------------------
# Quota configuration
# --------------------------------------------------
# Simulations and /ai/narrate share a single pool: they are the same
# prompt against the same model, so metering them separately would let
# a user exhaust one and keep spending on the other.

FREE_MONTHLY_SIMULATIONS = 5

METERED_FEATURE = "simulation"


# --------------------------------------------------
# HTTP Bearer Auth Scheme
# --------------------------------------------------
# auto_error=False so a missing header produces our own 401 shape
# rather than FastAPI's, which keeps client error handling uniform.

security = HTTPBearer(auto_error=False)


# --------------------------------------------------
# Extract Token From Request
# --------------------------------------------------

def get_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials


# --------------------------------------------------
# Get Current User
# --------------------------------------------------

def get_current_user(
    token: str = Depends(get_token),
    db: Session = Depends(get_db),
) -> User:

    try:
        payload = ensure_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise ValueError("Token missing subject")

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# --------------------------------------------------
# Active User Guard
# --------------------------------------------------

def get_current_active_user(
    user: User = Depends(get_current_user),
) -> User:

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return user


# --------------------------------------------------
# Admin Guard
# --------------------------------------------------

def require_admin(
    user: User = Depends(get_current_active_user),
) -> User:

    if not getattr(user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return user


# --------------------------------------------------
# LAYER 1: Global authentication dependency
# --------------------------------------------------
# Attached to the FastAPI app in main.py. Runs on every request that
# is not explicitly allowlisted as public.
#
# This ONLY establishes identity. Object-level ownership is still the
# handler's job (layer 3) — knowing who you are does not mean you may
# touch the row you asked for.

PUBLIC_PATH_PREFIXES: tuple[str, ...] = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/google",
    "/api/auth/apple",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def _is_public(path: str) -> bool:
    if path == "/":
        return True
    return path.startswith(PUBLIC_PATH_PREFIXES)


def global_auth_guard(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Fail-closed authentication for every route.

    A new endpoint added tomorrow is protected by default. Forgetting
    to allowlist a genuinely public route yields a loud 401 that is
    caught in seconds; forgetting a per-route guard yields a silent
    data leak that is caught in months. The asymmetry is the whole
    argument for doing it this way.
    """

    if _is_public(request.url.path):
        return None

    # CORS preflight carries no Authorization header by design.
    if request.method == "OPTIONS":
        return None

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = auth_header.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = ensure_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Token missing subject")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Stashed so handlers can read it without a second DB hit.
    request.state.user = user

    return user


# --------------------------------------------------
# LAYER 3: Object-level ownership
# --------------------------------------------------

def require_ownership(resource_user_id, current_user: User) -> None:
    """
    Assert the authenticated user owns the row being touched.

    404 rather than 403 on mismatch: telling an attacker "that exists
    but isn't yours" confirms the ID is real. Denying existence leaks
    nothing.
    """
    if str(resource_user_id) != str(current_user.id):
        logger.warning(
            "Ownership violation: user %s attempted access to resource "
            "owned by %s",
            current_user.id,
            resource_user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )


# --------------------------------------------------
# LAYER 3: Quota metering
# --------------------------------------------------

def _has_unlimited_access(user: User) -> bool:
    """
    Entitlement check.

    Reads a `subscription_status` column if one exists so this keeps
    working once billing lands, without a migration being required
    first. Admins are always unlimited.
    """
    if getattr(user, "is_admin", False):
        return True

    status_value = getattr(user, "subscription_status", None)

    return status_value in ("active", "trialing")


def get_quota_state(db: Session, user: User) -> dict:
    """
    Read-only quota snapshot. Does not increment.

    Used by GET /simulations/quota so the client can render "3 of 5
    left" and gate the button before the user does any work.
    """
    if _has_unlimited_access(user):
        return {
            "limit": None,
            "used": 0,
            "remaining": None,
            "unlimited": True,
            "period": current_period(),
        }

    period = current_period()

    row = (
        db.query(UsageCounter)
        .filter(
            UsageCounter.user_id == user.id,
            UsageCounter.period == period,
            UsageCounter.feature == METERED_FEATURE,
        )
        .first()
    )

    used = row.count if row else 0

    return {
        "limit": FREE_MONTHLY_SIMULATIONS,
        "used": used,
        "remaining": max(0, FREE_MONTHLY_SIMULATIONS - used),
        "unlimited": False,
        "period": period,
    }


def consume_quota(db: Session, user: User) -> dict:
    """
    Atomically check-and-increment. Raises 402 when exhausted.

    Called BEFORE any billable work (engine run, Anthropic call).
    Charging first and computing second means a user cannot exhaust
    your API budget by triggering failures.

    Concurrency: SELECT ... FOR UPDATE takes a row lock so ten
    simultaneous requests serialize rather than all reading `4` and
    all incrementing to `5`.
    """

    if _has_unlimited_access(user):
        return {"unlimited": True, "remaining": None}

    period = current_period()

    row = (
        db.query(UsageCounter)
        .filter(
            UsageCounter.user_id == user.id,
            UsageCounter.period == period,
            UsageCounter.feature == METERED_FEATURE,
        )
        .with_for_update()
        .first()
    )

    if row is None:
        row = UsageCounter(
            user_id=user.id,
            period=period,
            feature=METERED_FEATURE,
            count=0,
        )
        db.add(row)
        try:
            db.flush()
        except Exception:
            # Lost an insert race — another request created it first.
            db.rollback()
            row = (
                db.query(UsageCounter)
                .filter(
                    UsageCounter.user_id == user.id,
                    UsageCounter.period == period,
                    UsageCounter.feature == METERED_FEATURE,
                )
                .with_for_update()
                .first()
            )

    if row.count >= FREE_MONTHLY_SIMULATIONS:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "quota_exceeded",
                "message": (
                    f"You've used all {FREE_MONTHLY_SIMULATIONS} free "
                    f"simulations this month."
                ),
                "limit": FREE_MONTHLY_SIMULATIONS,
                "used": row.count,
                "remaining": 0,
                "period": period,
            },
        )

    row.count += 1
    db.commit()

    return {
        "unlimited": False,
        "remaining": max(0, FREE_MONTHLY_SIMULATIONS - row.count),
        "used": row.count,
        "limit": FREE_MONTHLY_SIMULATIONS,
    }


def refund_quota(db: Session, user: User) -> None:
    """
    Give back one unit when billable work failed after consumption.

    Never raises — a failed refund must not mask the original error
    that triggered it.
    """
    if _has_unlimited_access(user):
        return

    try:
        period = current_period()
        row = (
            db.query(UsageCounter)
            .filter(
                UsageCounter.user_id == user.id,
                UsageCounter.period == period,
                UsageCounter.feature == METERED_FEATURE,
            )
            .with_for_update()
            .first()
        )
        if row and row.count > 0:
            row.count -= 1
            db.commit()
    except Exception as e:
        logger.warning("Quota refund failed for user %s: %s", user.id, e)
        try:
            db.rollback()
        except Exception:
            pass


def require_simulation_quota(
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Drop-in dependency for metered endpoints.

    Note this consumes on entry. Handlers that may fail should call
    refund_quota() in their exception path.
    """
    consume_quota(db, user)
    return user