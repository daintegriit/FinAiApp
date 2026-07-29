
import hmac
import logging
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)


# --------------------------------------------------
# Event classification
# --------------------------------------------------
# RevenueCat sends one webhook per subscription lifecycle event. We
# only care whether the event leaves the user entitled or not — the
# store (Apple/Google) is the source of truth for dates and RevenueCat
# has already validated the receipt before calling us.
#
# https://www.revenuecat.com/docs/webhooks

GRANTING_EVENTS = {
    "INITIAL_PURCHASE",
    "RENEWAL",
    "UNCANCELLATION",
    "PRODUCT_CHANGE",
    "SUBSCRIPTION_EXTENDED",
}

REVOKING_EVENTS = {
    "EXPIRATION",
    "CANCELLATION",       # access continues until expiry; see note below
    "BILLING_ISSUE",
    "SUBSCRIPTION_PAUSED",
}


def _parse_ms(value) -> datetime | None:
    """RevenueCat timestamps are epoch milliseconds."""
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=UTC)
    except (ValueError, TypeError):
        return None


# --------------------------------------------------
# POST /billing/revenuecat/webhook
# --------------------------------------------------
# Public route: RevenueCat's servers call it, not an authenticated
# user. It must be added to PUBLIC_PATH_PREFIXES in dependencies.py, or
# the global auth guard will reject RevenueCat with a 401.
#
# Authentication is instead a shared secret in the Authorization
# header, configured in the RevenueCat dashboard. Without this check
# anyone who finds the URL could grant themselves a subscription.

@router.post("/revenuecat/webhook", status_code=status.HTTP_200_OK)
async def revenuecat_webhook(
    request: Request,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    expected = getattr(settings, "REVENUECAT_WEBHOOK_SECRET", None)

    if not expected:
        # Fail closed: an unconfigured secret must not mean "accept
        # everything." Log loudly so it's caught in staging.
        logger.error("REVENUECAT_WEBHOOK_SECRET is not set; rejecting webhook")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Billing webhook not configured",
        )

    # Constant-time comparison — a plain == leaks timing information
    # about how many leading characters matched.
    if not authorization or not hmac.compare_digest(authorization, expected):
        logger.warning("RevenueCat webhook rejected: bad authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )

    body = await request.json()
    event = body.get("event", {}) or {}

    event_type = event.get("type")
    app_user_id = event.get("app_user_id")
    expiration_ms = event.get("expiration_at_ms")

    if not event_type or not app_user_id:
        # Acknowledge malformed events with 200 so RevenueCat doesn't
        # retry forever, but record them.
        logger.warning("RevenueCat webhook missing type/app_user_id: %s", event_type)
        return {"status": "ignored", "reason": "missing fields"}

    # app_user_id is whatever the app passed to Purchases.logIn().
    # We set it to our own user UUID, so it maps directly.
    user = db.query(User).filter(User.id == app_user_id).first()

    if not user:
        # RevenueCat also emits anonymous ($RCAnonymousID) events before
        # a logIn. Nothing to attribute — acknowledge and move on.
        logger.info("RevenueCat event for unknown app_user_id=%s", app_user_id)
        return {"status": "ignored", "reason": "unknown user"}

    expires_at = _parse_ms(expiration_ms)

    if event_type in GRANTING_EVENTS:
        user.subscription_status = "active"
        user.subscription_expires_at = expires_at
        logger.info("Subscription granted for user %s (%s)", user.id, event_type)

    elif event_type in REVOKING_EVENTS:
        # CANCELLATION means auto-renew was turned off, but the user
        # keeps access until the period ends. If the expiry is still in
        # the future, leave them active — the later EXPIRATION event
        # flips them off. Only revoke immediately when already expired.
        now = datetime.now(UTC)

        if expires_at and expires_at > now:
            user.subscription_status = "active"
            user.subscription_expires_at = expires_at
            logger.info(
                "Subscription cancelled but still active until %s for user %s",
                expires_at,
                user.id,
            )
        else:
            user.subscription_status = "expired"
            user.subscription_expires_at = expires_at
            logger.info(
                "Subscription revoked for user %s (%s)", user.id, event_type
            )

    else:
        # TEST, TRANSFER, and events we don't act on. Acknowledge.
        logger.info("RevenueCat event %s acknowledged, no action", event_type)
        return {"status": "acknowledged", "event": event_type}

    db.commit()

    return {"status": "ok", "event": event_type, "user_id": str(user.id)}