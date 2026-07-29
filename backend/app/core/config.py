from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "onboarding@resend.dev"

    # --------------------------------------------------
    # Application Metadata
    # --------------------------------------------------

    APP_NAME: str = "FinAI Financial Simulation Platform"

    APP_VERSION: str = "1.0.0"

    ENV: str = Field(
        default="development",
        description="Application environment",
    )

    DEBUG: bool = True

    # --------------------------------------------------
    # Server
    # --------------------------------------------------

    HOST: str = "0.0.0.0"

    PORT: int = 8080

    # --------------------------------------------------
    # Database
    # --------------------------------------------------

    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/finai"
    )

    DB_ECHO: bool = False

    DB_POOL_SIZE: int = 10

    DB_MAX_OVERFLOW: int = 20

    # --------------------------------------------------
    # Security
    # --------------------------------------------------
    # JWT_SECRET_KEY has no usable default. main.py hard-fails at
    # startup in production if this is still the placeholder, so a
    # misconfigured deploy refuses to boot rather than signing tokens
    # with a guessable key.

    JWT_SECRET_KEY: str = "CHANGE_ME_SECRET"

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GOOGLE_IOS_CLIENT_ID: str = (
        "466323878357-l7a3rcma7e4dfeesk86fo0vghojetpd5.apps.googleusercontent.com"
    )
    GOOGLE_WEB_CLIENT_ID: str = (
        "466323878357-nr7s0ghh9bimc760b2dqhvsq5ta14bo9.apps.googleusercontent.com"
    )
    APPLE_BUNDLE_ID: str = "com.finbudgetai.app"

    # --------------------------------------------------
    # Billing (RevenueCat)
    # --------------------------------------------------
    # Shared secret set in the RevenueCat webhook config AND here (via
    # Cloud Run env). billing.py rejects all webhook calls with 503
    # until this is set, and 401 on any call whose Authorization header
    # doesn't match — fail-closed by design.

    REVENUECAT_WEBHOOK_SECRET: Optional[str] = None

    # --------------------------------------------------
    # CORS
    # --------------------------------------------------
    # NOTE: main.py reads CORS_ORIGINS. Keeping both names in sync so
    # the production origin lockdown actually applies instead of
    # silently falling back to permissive defaults.

    CORS_ORIGINS: List[str] = [
        "https://finbudgetai.com",
        "https://www.finbudgetai.com",
    ]

    # Kept for backwards compatibility with any code referencing the
    # old name; mirror of CORS_ORIGINS.
    CORS_ALLOW_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    CORS_ALLOW_CREDENTIALS: bool = True

    CORS_ALLOW_METHODS: List[str] = ["*"]

    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # --------------------------------------------------
    # Feature Flags
    # --------------------------------------------------

    ENABLE_SCENARIO_ENGINE: bool = True
    ENABLE_PORTFOLIO_ENGINE: bool = True
    ENABLE_FINANCIAL_ANALYSIS: bool = True
    ENABLE_COMMITMENT_LOCK: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()