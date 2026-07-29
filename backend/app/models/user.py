from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    """
    Core user model for authentication and account management.
    Fully aligned with Profile + future financial system.
    """

    __tablename__ = "users"

    # --------------------------------------------------
    # PRIMARY KEY (UUID)
    # --------------------------------------------------

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # --------------------------------------------------
    # IDENTITY
    # --------------------------------------------------

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    username = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    # --------------------------------------------------
    # AUTHENTICATION
    # --------------------------------------------------

    password_hash = Column(
        String,
        nullable=False
    )

    # --------------------------------------------------
    # ACCOUNT STATE
    # --------------------------------------------------

    is_active = Column(
        Boolean,
        default=True
    )

    is_admin = Column(
        Boolean,
        default=False
    )

    is_verified = Column(
        Boolean,
        default=False
    )

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

    last_login = Column(
        DateTime,
        nullable=True
    )

    # --------------------------------------------------
    # PASSWORD RESET
    # --------------------------------------------------

    reset_token = Column(
        String,
        nullable=True,
        index=True
    )

    reset_token_expiry = Column(
        DateTime,
        nullable=True
    )

    # --------------------------------------------------
    # TERMS & CONDITIONS
    # --------------------------------------------------

    terms_accepted_at = Column(
        DateTime,
        nullable=True
    )
    # --------------------------------------------------
    # 🔥 RELATIONSHIPS (CRITICAL FIX)
    # --------------------------------------------------

    # 1-to-1 Profile
    profile = relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    # 🔥 FUTURE READY (optional)
    # transactions = relationship("Transaction", back_populates="user")

    # --------------------------------------------------
    # INDEXES
    # --------------------------------------------------

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_username", "username"),
    )

    # --------------------------------------------------
    # SERIALIZATION (ELITE)
    # --------------------------------------------------

    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.username,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "terms_accepted_at": self.terms_accepted_at.isoformat() if self.terms_accepted_at else None,
        }

    # --------------------------------------------------
    # DEBUG
    # --------------------------------------------------

    def __repr__(self) -> str:
        return f"<User {self.email}>"