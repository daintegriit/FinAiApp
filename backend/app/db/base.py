from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


# --------------------------------------------------
# SQLAlchemy Base
# --------------------------------------------------

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    Every model in app/models should inherit from this.
    """
    pass


# --------------------------------------------------
# Import Models for Alembic Autogeneration
# --------------------------------------------------
# These imports ensure SQLAlchemy registers the models
# so Alembic can detect them during migration generation.

from app.models.financial_analysis_run import FinancialAnalysisRun  # noqa: F401,E402
from app.models.engine_result import EngineResult  # noqa: F401,E402