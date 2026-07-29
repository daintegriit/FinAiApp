from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --------------------------------------------------
    # Application
    # --------------------------------------------------

    APP_NAME: str = "FinAI API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    DEBUG: bool = True

    # --------------------------------------------------
    # Server
    # --------------------------------------------------

    HOST: str = "0.0.0.0"
    PORT: int = 8080

    # --------------------------------------------------
    # Financial Defaults (REQUIRED BY ENGINES)
    # --------------------------------------------------

    DEFAULT_ANNUAL_RETURN: float = 0.07
    DEFAULT_ANNUAL_INFLATION: float = 0.02

    # --------------------------------------------------
    # Database
    # --------------------------------------------------

    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/finai"
    )

    DB_ECHO: bool = False

    # --------------------------------------------------
    # JWT / Auth
    # --------------------------------------------------

    JWT_SECRET_KEY: str = "CHANGE_ME_SECRET"
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --------------------------------------------------
    # CORS
    # --------------------------------------------------

    CORS_ALLOW_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173"
    ]

    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()