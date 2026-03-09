from __future__ import annotations

import re
from passlib.context import CryptContext


# --------------------------------------------------
# Password Hash Context
# --------------------------------------------------

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# --------------------------------------------------
# Hash Password
# --------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    """

    return pwd_context.hash(password)


# --------------------------------------------------
# Verify Password
# --------------------------------------------------

def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain-text password against a stored hash.
    """

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# --------------------------------------------------
# Optional: Password Strength Validation
# --------------------------------------------------

def validate_password_strength(password: str) -> None:
    """
    Optional password strength validator.

    Raises ValueError if password is weak.
    """

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain an uppercase letter")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain a lowercase letter")

    if not re.search(r"\d", password):
        raise ValueError("Password must contain a number")