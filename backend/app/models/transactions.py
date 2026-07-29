from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy import Column, String, Float, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    # --------------------------------------------------
    # PRIMARY KEY (UUID — consistent with system)
    # --------------------------------------------------

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # --------------------------------------------------
    # USER RELATIONSHIP
    # --------------------------------------------------

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------
    # CORE COLUMNS
    # --------------------------------------------------

    category = Column(String, nullable=False, index=True)
    merchant = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)

    # --------------------------------------------------
    # RECURRENCE
    # --------------------------------------------------
    # Distinguishes one-time purchases (most transactions:
    # restaurants, gas, groceries) from genuinely recurring
    # commitments (subscriptions, rent, loan payments). This
    # determines which financial engine math applies:
    #   - one-time  -> lump-sum opportunity cost calculation
    #   - recurring -> commitment_lock annuity-style modeling
    is_recurring = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    # Only meaningful when is_recurring is true — the expected
    # duration of the commitment in months (e.g. 12 for an annual
    # subscription, 36 for a car loan). Null for one-time purchases.
    recurring_term_months = Column(
        Float,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    # --------------------------------------------------
    # SERIALIZATION
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "category": self.category,
            "merchant": self.merchant,
            "note": self.note,
            "amount": float(self.amount),
            "is_recurring": bool(self.is_recurring),
            "recurring_term_months": (
                float(self.recurring_term_months)
                if self.recurring_term_months is not None
                else None
            ),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    def __repr__(self) -> str:
        return (
            f"<Transaction id={self.id} "
            f"category={self.category} "
            f"amount={self.amount}>"
        )