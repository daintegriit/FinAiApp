from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()


# --------------------------------------------------
# Database URL
# --------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback for development / CI if no DB configured
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./dev.db"


# --------------------------------------------------
# SQLAlchemy Engine
# --------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)


# --------------------------------------------------
# Session Factory
# --------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# --------------------------------------------------
# FastAPI Dependency
# --------------------------------------------------

def get_db() -> Session:

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()