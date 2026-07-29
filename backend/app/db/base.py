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
# Import Models for Alembic Autogeneration + create_all
# --------------------------------------------------
# Every model module is imported here so SQLAlchemy registers all
# tables on Base.metadata. This enables both Alembic autogenerate and
# Base.metadata.create_all() to see the complete schema. Using module
# imports (not named class imports) so this is robust regardless of
# what each model class is called.

import app.models.user  # noqa: F401,E402
import app.models.profile  # noqa: F401,E402
import app.models.financial_profile  # noqa: F401,E402
import app.models.transactions  # noqa: F401,E402
import app.models.categories  # noqa: F401,E402
import app.models.simulation  # noqa: F401,E402
import app.models.push_token  # noqa: F401,E402
import app.models.merchant_cache  # noqa: F401,E402
import app.models.financial_analysis_run  # noqa: F401,E402
import app.models.engine_result  # noqa: F401,E402
import app.models.report  # noqa: F401,E402
import app.models.scenario  # noqa: F401,E402
import app.models.portfolio  # noqa: F401,E402
import app.models.peers  # noqa: F401,E402
import app.models.usage  # noqa: F401,E402