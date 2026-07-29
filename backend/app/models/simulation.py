from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class Simulation(Base):
    """
    Stores a user-named financial simulation (what-if scenario).
    """

    __tablename__ = "simulations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    name = Column(String, nullable=False, default="Untitled Simulation")

    amount = Column(Float, nullable=False)
    term_months = Column(Float, nullable=False)
    category = Column(String, nullable=True)


    # Full analysis result, stored as JSON
    result = Column(JSON, nullable=False)

    # AI-generated plain-English explanation of this simulation's
    # result, generated once at creation time and persisted here so
    # ResultPanel never needs to re-call Claude on every screen view.
    narrative = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "amount": self.amount,
            "term": self.term_months,
            "category": self.category,
            "result": self.result,
            "narrative": self.narrative,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Simulation id={self.id} name={self.name}>"