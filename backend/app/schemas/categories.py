from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# ======================================================
# BASE
# ======================================================

class CategoryBase(BaseModel):

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    icon: str | None = None

    budget: float = 0

    spent: float = 0

    is_default: bool = False


# ======================================================
# CREATE
# ======================================================

class CategoryCreate(CategoryBase):
    user_id: uuid.UUID


# ======================================================
# UPDATE
# ======================================================

class CategoryUpdate(BaseModel):

    name: str | None = None

    icon: str | None = None

    budget: float | None = None

    spent: float | None = None


# ======================================================
# RESPONSE
# ======================================================

class CategoryResponse(CategoryBase):

    id: uuid.UUID

    user_id: uuid.UUID | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )