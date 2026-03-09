from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings


# --------------------------------------------------
# Route Imports (HTTP Layer)
# --------------------------------------------------

from app.routes.auth import router as auth_router
from app.routes.user import router as user_router
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


# --------------------------------------------------
# App Initialization
# --------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FinAI Financial Simulation Platform",
    docs_url="/docs",
    redoc_url="/redoc"
)


# --------------------------------------------------
# Middleware
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Register Routers
# --------------------------------------------------

app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
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


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/", tags=["System"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


# --------------------------------------------------
# Health Endpoint
# --------------------------------------------------

@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "environment": settings.ENV,
    }