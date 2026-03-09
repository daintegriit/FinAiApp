from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Numeric,
    ForeignKey
)

from sqlalchemy.orm import relationship

from app.db.base import Base


class Profile(Base):

    __tablename__ = "profiles"

    profile_id = Column(String, primary_key=True, index=True)

    user_id = Column(
        String,
        ForeignKey("users.user_id"),
        nullable=False,
        index=True,
        unique=True
    )

    email = Column(String, nullable=True)

    country = Column(String(2), nullable=True)
    timezone = Column(String, nullable=True)

    age = Column(Integer, nullable=True)

    employment_type = Column(String, nullable=True)

    monthly_income = Column(Numeric(12, 2), nullable=True)

    risk_tolerance = Column(String, nullable=True)

    investment_experience = Column(String, nullable=True)

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

    # relationship back to user
    user = relationship("User", back_populates="profile")