from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, DateTime
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
    """

    __tablename__ = "engine_results"

    id = Column(Integer, primary_key=True)

    run_id = Column(
        Integer,
        ForeignKey("financial_analysis_runs.id"),
        nullable=False
    )

    engine_name = Column(String, nullable=False)

    runtime_ms = Column(Float)

    result = Column(JSON)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )