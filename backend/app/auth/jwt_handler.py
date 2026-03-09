from __future__ import annotations

import os
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()


# --------------------------------------------------
# JWT Configuration
# --------------------------------------------------

SECRET_KEY: str = os.getenv(
    "JWT_SECRET_KEY",
    "dev-secret-change-this"
)

ALGORITHM: str = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
)

REFRESH_TOKEN_EXPIRE_DAYS: int = int(
    os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)
)


# --------------------------------------------------
# Create Access Token
# --------------------------------------------------

def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None
) -> str:

    expire = datetime.now(UTC) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": subject,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(UTC)
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# --------------------------------------------------
# Create Refresh Token
# --------------------------------------------------

def create_refresh_token(subject: str) -> str:

    expire = datetime.now(UTC) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )

    payload = {
        "sub": subject,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(UTC)
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# --------------------------------------------------
# Decode Token
# --------------------------------------------------

def decode_token(token: str) -> Dict[str, Any]:

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError as e:

        raise ValueError("Invalid token") from e


# --------------------------------------------------
# Extract Subject
# --------------------------------------------------

def get_subject(token: str) -> str:

    payload = decode_token(token)

    subject = payload.get("sub")

    if subject is None:
        raise ValueError("Token missing subject")

    return subject


# --------------------------------------------------
# Token Type Validation
# --------------------------------------------------

def ensure_access_token(token: str) -> Dict[str, Any]:

    payload = decode_token(token)

    if payload.get("type") != "access":
        raise ValueError("Invalid access token")

    return payload


def ensure_refresh_token(token: str) -> Dict[str, Any]:

    payload = decode_token(token)

    if payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token")

    return payload