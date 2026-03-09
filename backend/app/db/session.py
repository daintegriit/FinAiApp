from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

# --------------------------------------------------
# Database URL Resolution
# --------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback for development / CI environments
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./dev.db"

# --------------------------------------------------
# Engine Configuration
# --------------------------------------------------

engine_kwargs = {
    "pool_pre_ping": True,
}

# SQLite requires special thread handling
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

else:
    # Production databases
    engine_kwargs.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 1800,
        }
    )

engine = create_engine(DATABASE_URL, **engine_kwargs)

# --------------------------------------------------
# Session Factory
# --------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# --------------------------------------------------
# FastAPI Dependency
# --------------------------------------------------

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session
    and ensures proper cleanup.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()