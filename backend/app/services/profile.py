from __future__ import annotations

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.profile import Profile
from app.schemas.profile import (
    ProfileCreateRequest,
    ProfileUpdateRequest,
)


def get_profile(db: Session, user_id: str) -> Profile | None:
    return (
        db.query(Profile)
        .filter(Profile.user_id == user_id)
        .first()
    )


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
        financial_goal=payload.financial_goal,
        lifestyle=payload.lifestyle,
        income_stability=payload.income_stability,
        savings_amount=payload.savings_amount,
        debt_amount=payload.debt_amount,
        emergency_fund_months=payload.emergency_fund_months,
        city=payload.city,
        state=payload.state,
        zip_code=payload.zip_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


def update_profile(
    db: Session,
    profile: Profile,
    payload: ProfileUpdateRequest
) -> Profile:

    fields = [
        "email", "country", "timezone", "age",
        "employment_type", "monthly_income",
        "risk_tolerance", "investment_experience",
        "financial_goal", "lifestyle", "income_stability",
        "savings_amount", "debt_amount", "emergency_fund_months",
        "city", "state", "zip_code", "latitude", "longitude"
    ]

    for field in fields:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(profile, field, val)

    db.commit()
    db.refresh(profile)

    return profile


def delete_profile(db: Session, profile: Profile) -> None:
    db.delete(profile)
    db.commit()