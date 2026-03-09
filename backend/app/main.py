from __future__ import annotations

from fastapi import FastAPI

from app.core.config import settings

# --------------------------------------------------
# API Routers
# --------------------------------------------------

from app.api.commitment_lock import router as commitment_lock_router
from app.api.financial_analysis import router as financial_analysis_router
from app.api.financial_state import router as financial_state_router
from app.api.portfolio import router as portfolio_router
from app.api.scenario import router as scenario_router
from app.api.policy import router as policy_router
from app.api.benchmark import router as benchmark_router


# --------------------------------------------------
# App Initialization
# --------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="FinAI Financial Simulation Platform"
)


# --------------------------------------------------
# Register Routers
# --------------------------------------------------

app.include_router(commitment_lock_router, prefix="/api")
app.include_router(financial_analysis_router, prefix="/api")
app.include_router(financial_state_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(scenario_router, prefix="/api")
app.include_router(policy_router, prefix="/api")
app.include_router(benchmark_router, prefix="/api")


# --------------------------------------------------
# Root Endpoint
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs": "/docs"
    }


# --------------------------------------------------
# Health Endpoint
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": settings.ENV
    }