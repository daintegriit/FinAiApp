from __future__ import annotations

import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends

from app.schemas.profile import (
    ProfileCreateRequest,
    ProfileUpdateRequest,
    ProfileResponse,
)

from app.services.profile import (
    create_profile,
    get_profile,
    update_profile,
)

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/profile",
    tags=["User Profile"],
)


# --------------------------------------------------
# Create Profile
# --------------------------------------------------

@router.post(
    "/create",
    response_model=ProfileResponse,
    summary="Create user financial profile",
)
def create_user_profile(
    req: ProfileCreateRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    try:

        logger.info("Profile creation started")

        profile = create_profile(req)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Profile created in %sms",
            elapsed_ms
        )

        return ProfileResponse(
            status="success",
            processing_ms=elapsed_ms,
            profile=profile,
        )

    except ValueError as e:

        logger.warning("Profile validation error: %s", str(e))

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        logger.exception("Profile creation failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Profile creation failed",
                "message": str(e),
            },
        )


# --------------------------------------------------
# Get Profile
# --------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=ProfileResponse,
    summary="Retrieve user profile",
)
def fetch_profile(
    user_id: int,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    try:

        logger.info("Profile fetch started")

        profile = get_profile(user_id)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return ProfileResponse(
            status="success",
            processing_ms=elapsed_ms,
            profile=profile,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except Exception as e:

        logger.exception("Profile retrieval failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Profile retrieval failed",
                "message": str(e),
            },
        )


# --------------------------------------------------
# Update Profile
# --------------------------------------------------

@router.put(
    "/update",
    response_model=ProfileResponse,
    summary="Update user financial profile",
)
def update_user_profile(
    req: ProfileUpdateRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> ProfileResponse:

    start = time.perf_counter()

    try:

        logger.info("Profile update started")

        profile = update_profile(req)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info(
            "Profile updated in %sms",
            elapsed_ms
        )

        return ProfileResponse(
            status="success",
            processing_ms=elapsed_ms,
            profile=profile,
        )

    except ValueError as e:

        logger.warning("Profile validation error: %s", str(e))

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        logger.exception("Profile update failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Profile update failed",
                "message": str(e),
            },
        )