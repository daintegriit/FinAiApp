from fastapi import FastAPI
from app.core.config import settings
from app.api.commitment_lock import router as commitment_lock_router

app = FastAPI(title=settings.APP_NAME)

app.include_router(commitment_lock_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.ENV}
