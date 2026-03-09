from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.auth.jwt_handler import ensure_access_token


# --------------------------------------------------
# HTTP Bearer Auth Scheme
# --------------------------------------------------

security = HTTPBearer()


# --------------------------------------------------
# Extract Token From Request
# --------------------------------------------------

def get_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme"
        )

    return credentials.credentials


# --------------------------------------------------
# Get Current User
# --------------------------------------------------

def get_current_user(
    token: str = Depends(get_token),
    db: Session = Depends(get_db)
) -> User:

    try:

        payload = ensure_access_token(token)

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

    except Exception:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


# --------------------------------------------------
# Active User Guard
# --------------------------------------------------

def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:

    if hasattr(user, "is_active") and not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


# --------------------------------------------------
# Admin Guard
# --------------------------------------------------

def require_admin(
    user: User = Depends(get_current_active_user)
) -> User:

    if not getattr(user, "is_admin", False):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    return user