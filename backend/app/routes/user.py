
import time
import logging

from typing import List

from fastapi import APIRouter, HTTPException, status, Depends

from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
)

from app.services.user import (
    create_user,
    get_user,
    list_users,
    update_user,
    delete_user,
)

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# --------------------------------------------------
# Create User
# --------------------------------------------------

@router.post(
    "/create",
    response_model=UserResponse,
    summary="Create a new user",
)
def create_user_route(
    req: UserCreateRequest,
    # db: Session = Depends(get_db),
) -> UserResponse:

    start = time.perf_counter()

    try:

        logger.info("User creation started")

        user = create_user(req)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        logger.info("User created in %sms", elapsed_ms)

        return UserResponse(
            status="success",
            processing_ms=elapsed_ms,
            user=user
        )

    except ValueError as e:

        logger.warning("User validation error: %s", str(e))

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:

        logger.exception("User creation failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "User creation failed",
                "message": str(e)
            }
        )


# --------------------------------------------------
# Get User
# --------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Retrieve user by ID",
)
def get_user_route(
    user_id: int,
    # db: Session = Depends(get_db),
) -> UserResponse:

    start = time.perf_counter()

    try:

        logger.info("User retrieval started")

        user = get_user(user_id)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return UserResponse(
            status="success",
            processing_ms=elapsed_ms,
            user=user
        )

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    except Exception as e:

        logger.exception("User retrieval failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "User retrieval failed",
                "message": str(e)
            }
        )


# --------------------------------------------------
# List Users
# --------------------------------------------------

@router.get(
    "/",
    response_model=List[UserResponse],
    summary="List all users",
)
def list_users_route(
    # db: Session = Depends(get_db),
) -> List[UserResponse]:

    try:

        users = list_users()

        return [
            UserResponse(
                status="success",
                processing_ms=0,
                user=user
            )
            for user in users
        ]

    except Exception as e:

        logger.exception("User list failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# --------------------------------------------------
# Update User
# --------------------------------------------------

@router.put(
    "/update",
    response_model=UserResponse,
    summary="Update user",
)
def update_user_route(
    req: UserUpdateRequest,
    # db: Session = Depends(get_db),
) -> UserResponse:

    start = time.perf_counter()

    try:

        logger.info("User update started")

        user = update_user(req)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return UserResponse(
            status="success",
            processing_ms=elapsed_ms,
            user=user
        )

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:

        logger.exception("User update failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# --------------------------------------------------
# Delete User
# --------------------------------------------------

@router.delete(
    "/{user_id}",
    summary="Delete user",
)
def delete_user_route(
    user_id: int,
    # db: Session = Depends(get_db),
):

    try:

        delete_user(user_id)

        return {
            "status": "success",
            "message": "User deleted"
        }

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    except Exception as e:

        logger.exception("User deletion failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )