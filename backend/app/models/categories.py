from __future__ import annotations

import uuid

from sqlalchemy import (
    String,
    Float,
    Boolean,
    ForeignKey,
    DateTime,
    text,
)

from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.db.base import Base


class Category(Base):

    __tablename__ = "categories"

    # ==================================================
    # PRIMARY KEY
    # ==================================================

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ==================================================
    # RELATIONSHIPS
    # ==================================================

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # ==================================================
    # CATEGORY DATA
    # ==================================================

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    icon: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    budget: Mapped[float] = mapped_column(
        Float,
        default=0,
    )

    spent: Mapped[float] = mapped_column(
        Float,
        default=0,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    # ==================================================
    # TIMESTAMPS
    # ==================================================

    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )