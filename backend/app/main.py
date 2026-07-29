from __future__ import annotations

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# --------------------------------------------------
# DB INIT
# --------------------------------------------------

from app.db.base import Base
from app.db.session import engine

# --------------------------------------------------
# FORCE MODEL REGISTRATION
# --------------------------------------------------
# Models must be imported before create_all / Alembic autogenerate,
# or their tables are never registered on Base.metadata.

from app.models.user import User
from app.models.profile import Profile
from app.models.transactions import Transaction
from app.models.financial_analysis_run import FinancialAnalysisRun
from app.models.categories import Category
from app.models.merchant_cache import MerchantCache
from app.models.push_token import PushToken
from app.models.simulation import Simulation
from app.models.usage import UsageCounter

# --------------------------------------------------
# Global auth guard (LAYER 1)
# --------------------------------------------------

from app.auth.dependencies import global_auth_guard

# --------------------------------------------------
# Route Imports
# --------------------------------------------------

from app.routes.auth import router as auth_router
from app.routes.profile import router as profile_router
from app.routes.scenario import router as scenario_router
from app.routes.portfolio import router as portfolio_router
from app.routes.report import router as report_router
from app.routes.dashboard import router as dashboard_router
from app.routes.benchmark import router as benchmark_router
from app.routes.commitment_lock import router as commitment_lock_router
from app.routes.financial_analysis import router as financial_analysis_router
from app.routes.financial_state import router as financial_state_router
from app.routes.policy import router as policy_router
from app.routes.transactions import router as transactions_router
from app.routes.categories import router as categories_router
from app.routes.peers import router as peers_router
from app.routes.notifications import router as notifications_router
from app.routes.simulations import router as simulations_router
from app.routes.admin import router as admin_router
from app.routes.ai import router as ai_router
from app.routes.billing import router as billing_router

# NOTE: app.routes.user is deliberately NOT imported or registered.
# It duplicated /auth functionality against an unbacked service layer,
# used int primary keys where every other model uses UUID, and exposed
# an unauthenticated GET /users/ that enumerated the entire userbase.
# Delete the file once you've confirmed nothing depends on it.

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter

logger = logging.getLogger(__name__)

IS_PRODUCTION = str(getattr(settings, "ENV", "development")).lower() in (
    "production",
    "prod",
)


# --------------------------------------------------
# App Initialization
# --------------------------------------------------
# Interactive docs publish the full API surface — every schema, every
# path. Fine in development, an attacker's site map in production.

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FinAI Financial Simulation Platform",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
    dependencies=[Depends(global_auth_guard)],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --------------------------------------------------
# Startup
# --------------------------------------------------

@app.on_event("startup")
def startup_checks():
    # Fail loudly rather than silently running on the dev JWT secret.
    from app.auth.jwt_handler import SECRET_KEY

    if IS_PRODUCTION and SECRET_KEY == "dev-secret-change-this":
        raise RuntimeError(
            "JWT_SECRET_KEY is unset in production. Anyone who has read "
            "the repository can forge a token for any user."
        )

    # create_all cannot express column changes, drops, or backfills.
    # Kept for local convenience only; production goes through Alembic.
    if not IS_PRODUCTION:
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Tables ensured (development auto-create)")
        except Exception as e:
            logger.error("Table creation failed: %s", e)
    else:
        logger.info("Production: skipping create_all, use Alembic migrations")


# --------------------------------------------------
# Middleware
# --------------------------------------------------
# allow_origins=["*"] with allow_credentials=True is rejected by every
# browser and, where honoured, lets any site issue authenticated calls
# on a user's behalf.

ALLOWED_ORIGINS = getattr(
    settings,
    "CORS_ORIGINS",
    None,
) or [
    "https://finbudgetai.com",
    "https://www.finbudgetai.com",
]

if not IS_PRODUCTION:
    ALLOWED_ORIGINS = ALLOWED_ORIGINS + [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# --------------------------------------------------
# Register Routers
# --------------------------------------------------
# Every router below inherits global_auth_guard from the app-level
# dependency. Public paths are allowlisted inside that guard, not here.

app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(scenario_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(commitment_lock_router, prefix="/api")
app.include_router(financial_analysis_router, prefix="/api")
app.include_router(financial_state_router, prefix="/api")
app.include_router(policy_router, prefix="/api")
app.include_router(benchmark_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(peers_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(simulations_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(billing_router, prefix="/api")


# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/", tags=["System"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# --------------------------------------------------
# Health
# --------------------------------------------------
# Public for uptime probes, so it must not disclose configuration.

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}