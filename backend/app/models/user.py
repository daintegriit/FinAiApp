from __future__ import annotations

import uuid
from datetime import datetime, UTC

from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Index
)

from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class User(Base):
    """
    Core user model for authentication and account management.
    """

    __tablename__ = "users"

    # --------------------------------------------------
    # Primary Key
    # --------------------------------------------------

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # --------------------------------------------------
    # Identity
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
    # Authentication
    # --------------------------------------------------

    password_hash = Column(
        String,
        nullable=False
    )

    # --------------------------------------------------
    # Account State
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
    # Audit Timestamps
    # --------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.utcnow
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
    # Index Optimization
    # --------------------------------------------------

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_username", "username"),
    )

    # --------------------------------------------------
    # Helper Methods
    # --------------------------------------------------

    def __repr__(self) -> str:
        return f"<User {self.email}>"