from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Numeric,
    ForeignKey,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    # --------------------------------------------------
    # IDENTITY
    # --------------------------------------------------

    email = Column(String, nullable=True)
    country = Column(String(2), nullable=True)
    timezone = Column(String, nullable=True)

    # --------------------------------------------------
    # DEMOGRAPHICS
    # --------------------------------------------------

    age = Column(Integer, nullable=True)
    employment_type = Column(String, nullable=True)
    monthly_income = Column(Numeric(12, 2), nullable=True)
    risk_tolerance = Column(String, nullable=True)
    investment_experience = Column(String, nullable=True)

    # --------------------------------------------------
    # FINANCIAL PROFILE
    # --------------------------------------------------

    financial_goal = Column(String, nullable=True)
    lifestyle = Column(String, nullable=True)
    income_stability = Column(String, nullable=True)
    savings_amount = Column(Numeric(12, 2), nullable=True)
    debt_amount = Column(Numeric(12, 2), nullable=True)
    emergency_fund_months = Column(Integer, nullable=True)

    # --------------------------------------------------
    # LOCATION (for peer benchmarking)
    # --------------------------------------------------

    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String(10), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)

    # --------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship("User", back_populates="profile")

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "email": self.email,
            "country": self.country,
            "timezone": self.timezone,
            "age": self.age,
            "employment_type": self.employment_type,
            "monthly_income": float(self.monthly_income) if self.monthly_income else None,
            "risk_tolerance": self.risk_tolerance,
            "investment_experience": self.investment_experience,
            "financial_goal": self.financial_goal,
            "lifestyle": self.lifestyle,
            "income_stability": self.income_stability,
            "savings_amount": float(self.savings_amount) if self.savings_amount else None,
            "debt_amount": float(self.debt_amount) if self.debt_amount else None,
            "emergency_fund_months": self.emergency_fund_months,
            "city": self.city,
            "state": self.state,
            "zip_code": self.zip_code,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Profile user_id={self.user_id}>"