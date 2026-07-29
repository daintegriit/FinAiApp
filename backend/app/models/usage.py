from __future__ import annotations

import uuid
from datetime import datetime, UTC

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


def current_period() -> str:
    """
    Calendar-month period key, e.g. "2026-07".

    Calendar month is used rather than a rolling 30-day window because
    it is far easier to explain to users ("5 free simulations a month,
    resets on the 1st") and trivially cheap to compute without storing
    a per-user reset timestamp.
    """
    now = datetime.now(UTC)
    return f"{now.year:04d}-{now.month:02d}"


class UsageCounter(Base):
    """
    Tracks metered feature consumption per user, per calendar month.

    One row per (user_id, period, feature). Rows are created lazily on
    first use and never deleted — they double as a usage history for
    analytics and for answering billing disputes.

    IMPORTANT: increments must happen inside a row-level lock (see
    app.auth.dependencies.consume_quota) or concurrent requests will
    race past the limit.
    """

    __tablename__ = "usage_counters"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # "2026-07"
    period = Column(String(7), nullable=False, index=True)

    # "simulation" | "narrate" | future metered features
    feature = Column(String(32), nullable=False)

    count = Column(Integer, nullable=False, default=0)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period",
            "feature",
            name="uq_usage_user_period_feature",
        ),
        Index(
            "ix_usage_lookup",
            "user_id",
            "period",
            "feature",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "period": self.period,
            "feature": self.feature,
            "count": self.count,
        }

    def __repr__(self) -> str:
        return (
            f"<UsageCounter user={self.user_id} "
            f"{self.feature}@{self.period}={self.count}>"
        )