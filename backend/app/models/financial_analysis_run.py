from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class FinancialAnalysisRun(Base):
    """
    Stores a single financial analysis execution.

    Each time the /financial/analyze endpoint runs,
    one record is created here.

    Designed for:
    - UUID-based identity system
    - Horizontal scaling (GCP-ready)
    - Multi-user tracking
    """

    __tablename__ = "financial_analysis_runs"

    # --------------------------------------------------
    # PRIMARY KEY (UUID — CONSISTENT WITH USERS)
    # --------------------------------------------------

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # --------------------------------------------------
    # OWNER (MATCHES users.id TYPE)
    # --------------------------------------------------

    user_id = Column(
        UUID(as_uuid=True),  # ✅ MUST MATCH users.id
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # --------------------------------------------------
    # ANALYSIS OUTPUT
    # --------------------------------------------------

    global_financial_score = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------
    # PERFORMANCE METRICS
    # --------------------------------------------------

    processing_ms = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------
    # TIMESTAMP
    # --------------------------------------------------

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # --------------------------------------------------
    # SERIALIZATION (IMPORTANT FOR API)
    # --------------------------------------------------

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "global_financial_score": self.global_financial_score,
            "processing_ms": self.processing_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    # --------------------------------------------------
    # DEBUGGING
    # --------------------------------------------------

    def __repr__(self) -> str:
        return f"<FinancialAnalysisRun id={self.id} score={self.global_financial_score}>"