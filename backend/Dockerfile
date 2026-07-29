# =====================================================
# 💎 FINAI — BACKEND DOCKERFILE
# Optimized for GCP Cloud Run
# =====================================================

FROM python:3.11-slim

# =====================================================
# ENVIRONMENT
# =====================================================

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# =====================================================
# SYSTEM DEPENDENCIES
# =====================================================

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# =====================================================
# WORKING DIRECTORY
# =====================================================

WORKDIR /app

# =====================================================
# INSTALL DEPENDENCIES
# =====================================================

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir httpx cryptography alembic

# =====================================================
# COPY APP
# =====================================================

COPY . .

# =====================================================
# EXPOSE PORT
# =====================================================

EXPOSE 8080

# =====================================================
# START — run migrations, then launch
# =====================================================

CMD ["sh", "-c", "python -c 'import app.db.base; from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine)' && alembic stamp head && uvicorn app.main:app --host 0.0.0.0 --port 8080"]