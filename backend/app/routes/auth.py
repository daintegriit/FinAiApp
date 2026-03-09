from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.password_utils import verify_password, hash_password
from app.auth.jwt_handler import create_access_token, create_refresh_token
from app.auth.dependencies import get_current_user
from app.db.session import get_db

from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

from app.core.config import settings


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# --------------------------------------------------
# Register
# --------------------------------------------------

@router.post("/register", response_model=UserResponse)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Create a new user account
    """

    existing = db.query(User).filter(User.email == payload.email).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        is_active=True,
        is_admin=False
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Login
# --------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens
    """

    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=token_expires,
    )

    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


# --------------------------------------------------
# Current User
# --------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Return currently authenticated user
    """

    return current_user


# --------------------------------------------------
# Logout (Stateless JWT placeholder)
# --------------------------------------------------

@router.post("/logout")
def logout():
    """
    JWT logout placeholder.

    If refresh tokens or token blacklist are added,
    this endpoint will revoke tokens.
    """

    return {"message": "Logout successful"}