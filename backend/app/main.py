from fastapi import FastAPI

from app.core.config import settings

# Existing router
from app.api.commitment_lock import router as commitment_lock_router

# New Financial AI router
from app.api.financial_analysis import router as financial_analysis_router


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)


# --------------------------------------------------
# API Routers
# --------------------------------------------------

app.include_router(commitment_lock_router, prefix="/api")
app.include_router(financial_analysis_router, prefix="/api")


# --------------------------------------------------
# Health Endpoint
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "env": settings.ENV
    }