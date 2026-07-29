from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class EngineResult(Base):
    """
    Stores output from each financial engine.

    Example engines:
    - policy
    - portfolio
    - commitment_lock
    - scenarios
    - behavioral_drift

    Each record is linked to a FinancialAnalysisRun.
    """

    __tablename__ = "engine_results"

    # --------------------------------------------------
    # PRIMARY KEY (UUID — CONSISTENT SYSTEM)
    # --------------------------------------------------

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # --------------------------------------------------
    # RELATION → financial_analysis_runs (FIXED)
    # --------------------------------------------------

    run_id = Column(
        UUID(as_uuid=True),  # ✅ MUST MATCH parent table
        ForeignKey("financial_analysis_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # --------------------------------------------------
    # ENGINE INFO
    # --------------------------------------------------

    engine_name = Column(
        String,
        nullable=False,
        index=True
    )

    # --------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------

    runtime_ms = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------
    # ENGINE OUTPUT
    # --------------------------------------------------

    result = Column(
        JSON,
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
    # SERIALIZATION (API SAFE)
    # --------------------------------------------------

    def to_dict(self):
        return {
            "id": str(self.id),
            "run_id": str(self.run_id),
            "engine_name": self.engine_name,
            "runtime_ms": self.runtime_ms,
            "result": self.result,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    # --------------------------------------------------
    # DEBUG
    # --------------------------------------------------

    def __repr__(self):
        return f"<EngineResult engine={self.engine_name} run={self.run_id}>"