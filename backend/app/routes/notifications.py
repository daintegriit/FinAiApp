
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.push_token import PushToken
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# user_id removed. Previously any caller could overwrite another
# user's push token with their own device token and receive that
# user's notifications.

class PushTokenRequest(BaseModel):
    push_token: str = Field(..., min_length=1, max_length=255)
    platform: str = Field(default="ios", pattern="^(ios|android|web)$")


@router.post("/register")
def register_push_token(
    payload: PushTokenRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(PushToken)
        .filter(PushToken.user_id == current_user.id)
        .first()
    )

    if existing:
        existing.push_token = payload.push_token
        existing.platform = payload.platform
    else:
        db.add(
            PushToken(
                user_id=current_user.id,
                push_token=payload.push_token,
                platform=payload.platform,
            )
        )

    db.commit()

    logger.info("Push token registered for user %s", current_user.id)

    return {"status": "registered"}


@router.delete("/register")
def unregister_push_token(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Called on logout so the device stops receiving notifications."""
    deleted = (
        db.query(PushToken)
        .filter(PushToken.user_id == current_user.id)
        .delete(synchronize_session=False)
    )

    db.commit()

    return {"status": "unregistered", "removed": deleted}


# --------------------------------------------------
# POST /notifications/send-welcome
# --------------------------------------------------
# Was an unauthenticated endpoint taking user_id as a query param:
# anyone could push arbitrary notifications to any user, repeatedly.
#
# Now self-scoped only. Sending to *other* users belongs in
# /admin/users/{id}/push, which already requires an admin.

@router.post("/send-welcome")
def send_welcome_notification(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    token_row = (
        db.query(PushToken)
        .filter(PushToken.user_id == current_user.id)
        .first()
    )

    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No push token registered for this device",
        )

    try:
        response = httpx.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to": token_row.push_token,
                "title": "Welcome to FinBudgetAI",
                "body": (
                    "Your AI financial companion is ready. "
                    "Start tracking your spending!"
                ),
                "sound": "default",
            },
            timeout=15,
        )
        response.raise_for_status()

    except Exception as e:
        # Previously unhandled: an Expo outage raised straight through
        # as a 500 with a stack trace.
        logger.warning(
            "Welcome push failed for user %s: %s", current_user.id, e
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Notification service is temporarily unavailable",
        )

    return {"status": "sent"}