from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.profile import Profile
from app.schemas.profile import (
    ProfileCreateRequest,
    ProfileUpdateRequest,
)
from app.models.user import User


# --------------------------------------------------
# Get Profile
# --------------------------------------------------

def get_profile(db: Session, user_id: str) -> Profile | None:

    return (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )


# --------------------------------------------------
# Create Profile
# --------------------------------------------------

def create_profile(
    db: Session,
    payload: ProfileCreateRequest
) -> Profile:

    existing = get_profile(db, payload.user_id)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user"
        )

    profile = Profile(
        user_id=payload.user_id,
        email=payload.email,
        country=payload.country,
        timezone=payload.timezone,
        age=payload.age,
        employment_type=payload.employment_type,
        monthly_income=payload.monthly_income,
        risk_tolerance=payload.risk_tolerance,
        investment_experience=payload.investment_experience,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


# --------------------------------------------------
# Update Profile
# --------------------------------------------------

def update_profile(
    db: Session,
    profile: Profile,
    payload: ProfileUpdateRequest
) -> Profile:

    if payload.email is not None:
        profile.email = payload.email

    if payload.country is not None:
        profile.country = payload.country

    if payload.timezone is not None:
        profile.timezone = payload.timezone

    if payload.age is not None:
        profile.age = payload.age

    if payload.employment_type is not None:
        profile.employment_type = payload.employment_type

    if payload.monthly_income is not None:
        profile.monthly_income = payload.monthly_income

    if payload.risk_tolerance is not None:
        profile.risk_tolerance = payload.risk_tolerance

    if payload.investment_experience is not None:
        profile.investment_experience = payload.investment_experience

    db.commit()
    db.refresh(profile)

    return profile


# --------------------------------------------------
# Delete Profile
# --------------------------------------------------

def delete_profile(db: Session, profile: Profile) -> None:

    db.delete(profile)
    db.commit()