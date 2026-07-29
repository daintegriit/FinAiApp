
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import (
    ProfileCreateRequest,
    ProfileResponse,
    ProfileUpdateRequest,
)
from app.services.profile import create_profile, get_profile, update_profile

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/profile",
    tags=["User Profile"],
)

# All routes here inherit global_auth_guard from the app-level
# dependency in main.py. get_current_active_user is declared explicitly
# so handlers have the User object without a second lookup.


@router.post("/create", response_model=ProfileResponse)
def create_user_profile(
    req: ProfileCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    # Overwrite whatever the client sent. A caller naming its own
    # user_id is not identification, and the schema still carries the
    # field for backwards compatibility.
    if hasattr(req, "user_id"):
        req.user_id = current_user.id

    existing = get_profile(db, str(current_user.id))

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists. Use PUT /profile to update it.",
        )

    try:
        profile = create_profile(db, req)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return ProfileResponse(
            status="success",
            processing_ms=elapsed_ms,
            profile=profile.to_dict(),
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.exception("Profile creation failure for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Profile creation failed", "message": str(e)},
        )


# --------------------------------------------------
# GET /profile
# --------------------------------------------------
# Replaces GET /profile/{user_id}, which returned any user's income,
# debt, savings and risk profile to any caller with a valid UUID.

@router.get("", response_model=ProfileResponse)
def fetch_own_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    profile = get_profile(db, str(current_user.id))

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return ProfileResponse(
        status="success",
        processing_ms=elapsed_ms,
        profile=profile.to_dict(),
    )


@router.put("", response_model=ProfileResponse)
def update_own_profile(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    if hasattr(req, "user_id"):
        req.user_id = current_user.id

    profile = get_profile(db, str(current_user.id))

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    try:
        profile = update_profile(db, profile, req)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return ProfileResponse(
            status="success",
            processing_ms=elapsed_ms,
            profile=profile.to_dict(),
        )

    except Exception as e:
        db.rollback()
        logger.exception("Profile update failure for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Profile update failed", "message": str(e)},
        )


# --------------------------------------------------
# Deprecated aliases
# --------------------------------------------------
# The old paths are kept for one release so an app build that hasn't
# updated yet doesn't hard-fail. They ignore the supplied user_id
# entirely and serve the caller's own data.

@router.get("/{user_id}", response_model=ProfileResponse, deprecated=True)
def fetch_profile_legacy(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    if str(user_id) != str(current_user.id):
        logger.warning(
            "Legacy profile route: user %s requested %s",
            current_user.id,
            user_id,
        )
    return fetch_own_profile(current_user=current_user, db=db)


@router.put("/update", response_model=ProfileResponse, deprecated=True)
def update_profile_legacy(
    req: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    return update_own_profile(req=req, current_user=current_user, db=db)