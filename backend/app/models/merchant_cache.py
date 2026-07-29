from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class MerchantCache(Base):
    __tablename__ = "merchant_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_normalized = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    reasoning = Column(String, nullable=True)
    hit_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)