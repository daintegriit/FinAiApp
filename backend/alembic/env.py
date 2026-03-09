from __future__ import annotations

from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config, pool
from alembic import context

# --------------------------------------------------
# Ensure backend app is importable
# --------------------------------------------------

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# --------------------------------------------------
# Alembic Config
# --------------------------------------------------

config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --------------------------------------------------
# Import SQLAlchemy metadata
# --------------------------------------------------

from app.db.base import Base  # noqa: E402

# Import models so Alembic can detect them
# Add new models here when created
import app.models  # noqa: F401,E402

target_metadata = Base.metadata


# --------------------------------------------------
# Database URL override (optional)
# --------------------------------------------------

def get_database_url() -> str:
    """
    Allow DATABASE_URL env override.
    Useful for Docker / GCP deployments.
    """

    env_url = os.getenv("DATABASE_URL")

    if env_url:
        return env_url

    return config.get_main_option("sqlalchemy.url")


# --------------------------------------------------
# Offline migrations
# --------------------------------------------------

def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection.
    """

    url = get_database_url()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# --------------------------------------------------
# Online migrations
# --------------------------------------------------

def run_migrations_online() -> None:
    """
    Run migrations using a live DB connection.
    """

    configuration = config.get_section(config.config_ini_section)

    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# --------------------------------------------------
# Entry Point
# --------------------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()