from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserCreateRequest, UserUpdateRequest
from app.auth.password_utils import hash_password


# --------------------------------------------------
# Get User By Email
# --------------------------------------------------

def get_user_by_email(db: Session, email: str) -> User | None:

    return db.query(User).filter(User.email == email).first()


# --------------------------------------------------
# Get User By ID
# --------------------------------------------------

def get_user_by_id(db: Session, user_id: str) -> User | None:

    return db.query(User).filter(User.user_id == user_id).first()


# --------------------------------------------------
# Create User
# --------------------------------------------------

def create_user(db: Session, payload: UserCreateRequest) -> User:

    existing = get_user_by_email(db, payload.email)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status="active",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Update User
# --------------------------------------------------

def update_user(
    db: Session,
    user: User,
    payload: UserUpdateRequest
) -> User:

    if payload.email is not None:
        user.email = payload.email

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    if payload.role is not None:
        user.role = payload.role

    if payload.status is not None:
        user.status = payload.status

    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Delete User (Soft Delete)
# --------------------------------------------------

def delete_user(db: Session, user: User) -> User:

    user.status = "deleted"

    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Get User
# --------------------------------------------------

def get_user(db: Session, user_id: str) -> User | None:

    return db.query(User).filter(User.user_id == user_id).first()

# --------------------------------------------------
# List Users
# --------------------------------------------------

def list_users(db: Session, limit: int = 50, offset: int = 0) -> list[User]:

    return (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )