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