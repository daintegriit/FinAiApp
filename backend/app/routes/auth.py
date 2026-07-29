
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, UTC

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user, get_current_user
from app.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    ensure_refresh_token,
)
from app.auth.password_utils import hash_password, verify_password
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AppleAuthRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

from jose import jwt as jose_jwt

logger = logging.getLogger(__name__)

# Shared limiter. A second instance would decorate routes with limits
# the app never consults, since SlowAPI reads app.state.limiter.
from app.core.limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def _utcnow() -> datetime:
    """
    Timezone-aware UTC.

    datetime.utcnow() returns a naive datetime. Comparing that against
    a DateTime(timezone=True) column raises TypeError, which is why
    password reset expiry checks were a latent crash.
    """
    return datetime.now(UTC)


def _hash_reset_token(token: str) -> str:
    """
    Reset tokens are bearer credentials. Storing them in plaintext
    means a read-only DB leak is an account takeover on every user
    with a pending reset.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def _issue_tokens(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=create_refresh_token(subject=str(user.id)),
        token_type="bearer",
    )


# --------------------------------------------------
# Register
# --------------------------------------------------

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password[:72]),
        is_active=True,
        is_admin=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        from app.services.email import send_welcome_email
        send_welcome_email(user.email, user.username)
    except Exception as e:
        logger.warning("Welcome email failed for %s: %s", user.email, e)

    return user


# --------------------------------------------------
# Login
# --------------------------------------------------

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password[:72], user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return _issue_tokens(user)


# --------------------------------------------------
# Refresh
# --------------------------------------------------
# Access tokens last 60 minutes. Without this endpoint the refresh
# token issued at login had nothing to redeem against, so every
# session silently died after an hour.

class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(
    request: Request,
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    try:
        claims = ensure_refresh_token(payload.refresh_token)
        user_id = claims.get("sub")
        if not user_id:
            raise ValueError("Token missing subject")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return _issue_tokens(user)


# --------------------------------------------------
# Google Sign-In
# --------------------------------------------------

@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_auth(
    request: Request,
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.id_token},
                timeout=10,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token",
            )

        google_data = response.json()

        if google_data.get("aud") not in [
            settings.GOOGLE_IOS_CLIENT_ID,
            settings.GOOGLE_WEB_CLIENT_ID,
        ]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token audience mismatch",
            )

        # Accounts are matched by email. An unverified address would
        # let an attacker who controls it claim an existing account.
        email_verified = str(google_data.get("email_verified", "")).lower()
        if email_verified not in ("true", "1"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google email is not verified",
            )

        email = google_data.get("email")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google",
            )

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google token",
        )

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = _create_social_user(db, email)
        try:
            from app.services.email import send_google_welcome_email
            send_google_welcome_email(user.email, user.username)
        except Exception as e:
            logger.warning("Google welcome email failed: %s", e)

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return _issue_tokens(user)


# --------------------------------------------------
# Apple Sign-In
# --------------------------------------------------

@router.post("/apple", response_model=TokenResponse)
@limiter.limit("10/minute")
async def apple_auth(
    request: Request,
    payload: AppleAuthRequest,
    db: Session = Depends(get_db),
):
    try:
        async with httpx.AsyncClient() as client:
            keys_response = await client.get(
                "https://appleid.apple.com/auth/keys",
                timeout=10,
            )

        apple_keys = keys_response.json().get("keys", [])

        if not apple_keys:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch Apple keys",
            )

        unverified_header = jose_jwt.get_unverified_header(payload.identity_token)
        kid = unverified_header.get("kid")

        matching_key = next(
            (k for k in apple_keys if k.get("kid") == kid),
            None,
        )

        if not matching_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Apple key not found",
            )

        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
        from cryptography.hazmat.backends import default_backend
        import base64

        def decode_base64url(s: str) -> int:
            padded = s + "=" * (4 - len(s) % 4)
            return int.from_bytes(base64.urlsafe_b64decode(padded), "big")

        public_numbers = RSAPublicNumbers(
            e=decode_base64url(matching_key["e"]),
            n=decode_base64url(matching_key["n"]),
        )

        public_key = public_numbers.public_key(default_backend())

        claims = jose_jwt.decode(
            payload.identity_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_BUNDLE_ID,
            issuer="https://appleid.apple.com",
        )

        email_verified = str(claims.get("email_verified", "true")).lower()
        if email_verified not in ("true", "1"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Apple email is not verified",
            )

        email = claims.get("email") or payload.email

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Apple",
            )

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Apple token",
        )

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = _create_social_user(db, email)

    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return _issue_tokens(user)


def _create_social_user(db: Session, email: str) -> User:
    base_username = email.split("@")[0]
    username = base_username
    counter = 1

    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=email,
        username=username,
        password_hash=hash_password(str(uuid.uuid4())[:72]),
        is_active=True,
        is_admin=False,
        is_verified=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Current User
# --------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --------------------------------------------------
# Accept Terms
# --------------------------------------------------

@router.post("/accept-terms", response_model=UserResponse)
def accept_terms(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.terms_accepted_at = _utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user


# --------------------------------------------------
# Logout
# --------------------------------------------------

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Client-side only. Tokens carry no jti, so a stolen access token
    stays valid until it expires regardless of this call. Adding a
    revocation list is the fix when you need real logout.
    """
    return {"message": "Logout successful"}


# --------------------------------------------------
# Delete Account
# --------------------------------------------------
# Was DELETE /auth/delete/{user_id} with no authentication: any caller
# could permanently destroy any account by ID.

@router.delete("/me")
def delete_own_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models.categories import Category
    from app.models.profile import Profile
    from app.models.push_token import PushToken
    from app.models.simulation import Simulation
    from app.models.transactions import Transaction
    from app.models.usage import UsageCounter

    user_id = current_user.id

    try:
        for model in (
            Transaction,
            Category,
            Simulation,
            PushToken,
            Profile,
            UsageCounter,
        ):
            db.query(model).filter(model.user_id == user_id).delete(
                synchronize_session=False
            )

        db.delete(current_user)
        db.commit()

    except Exception:
        db.rollback()
        logger.exception("Account deletion failed for %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        )

    return {"message": "Account deleted successfully"}


# --------------------------------------------------
# Password Reset Request
# --------------------------------------------------
# Email moved from a query parameter into the body. Query strings are
# recorded in access logs, proxies, and Cloud Run request logs.

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()

    # Uniform response prevents email enumeration.
    generic = {"message": "If that email exists, a reset link has been sent."}

    if not user:
        return generic

    token = secrets.token_urlsafe(32)

    user.reset_token = _hash_reset_token(token)
    user.reset_token_expiry = _utcnow() + timedelta(hours=1)
    db.commit()

    try:
        from app.services.email import send_password_reset_email
        send_password_reset_email(user.email, user.username, token)
    except Exception as e:
        logger.error("Password reset email failed: %s", e)

    return generic


# --------------------------------------------------
# Password Reset Confirm
# --------------------------------------------------

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    hashed = _hash_reset_token(payload.token)

    user = db.query(User).filter(User.reset_token == hashed).first()

    if not user or not user.reset_token_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    expiry = user.reset_token_expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)

    if expiry < _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
        )

    user.password_hash = hash_password(payload.new_password[:72])
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return {"message": "Password reset successfully"}