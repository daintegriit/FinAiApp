
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user, require_ownership
from app.db.session import get_db
from app.models.categories import Category
from app.models.user import User
from app.schemas.categories import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    redirect_slashes=False,
)


# --------------------------------------------------
# GET /categories
# --------------------------------------------------
# Was scoped by a required user_id query param, so any caller could
# read any user's budgets.

@router.get("", response_model=list[CategoryResponse])
def get_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Category)
        .filter(Category.user_id == current_user.id)
        .order_by(Category.created_at.asc())
        .all()
    )


# --------------------------------------------------
# POST /categories
# --------------------------------------------------

@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name is required",
        )

    existing = (
        db.query(Category)
        .filter(
            Category.name == name,
            Category.user_id == current_user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists",
        )

    # data.user_id is ignored if the schema still carries it.
    category = Category(
        user_id=current_user.id,
        name=name,
        icon=data.icon,
        budget=data.budget,
        spent=data.spent,
        is_default=data.is_default,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    logger.info(
        "Category created: %s for user %s", category.name, current_user.id
    )

    return category


# --------------------------------------------------
# PATCH /categories/{category_id}
# --------------------------------------------------

@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category).filter(Category.id == category_id).first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    require_ownership(category.user_id, current_user)

    updates = data.model_dump(exclude_unset=True)

    # user_id is never client-assignable, even via a partial update.
    updates.pop("user_id", None)
    updates.pop("id", None)

    for key, value in updates.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)

    logger.info("Category updated: %s", category.id)

    return category


# --------------------------------------------------
# DELETE /categories/{category_id}
# --------------------------------------------------

@router.delete("/{category_id}")
def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category).filter(Category.id == category_id).first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    require_ownership(category.user_id, current_user)

    db.delete(category)
    db.commit()

    logger.info("Category deleted: %s", category_id)

    return {"success": True, "deleted_id": str(category_id)}