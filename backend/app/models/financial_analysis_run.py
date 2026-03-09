from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.db.base import Base


class FinancialAnalysisRun(Base):
    """
    Stores a single financial analysis execution.

    Each time the /financial/analyze endpoint runs,
    one record is created here.
    """

    __tablename__ = "financial_analysis_runs"

    id = Column(Integer, primary_key=True)

    # owner
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # overall result from orchestrator
    global_financial_score = Column(Float)

    # runtime performance metric
    processing_ms = Column(Float)

    # when the run happened
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )