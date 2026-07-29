
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.peer_map import get_peer_map_clusters
from app.services.peers import get_peer_benchmark

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/peers",
    tags=["Peers"],
)


# --------------------------------------------------
# GET /peers/benchmark
# --------------------------------------------------
# Was scoped by a client-supplied user_id, and leaked income alongside
# coarse location for whichever ID was passed.
#
# monthly_income also came from the client. It now comes from the
# caller's own profile: letting a user assert their income lets them
# shop for a flattering peer group, and the number was already stored.

@router.get("/benchmark")
def peer_benchmark(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    state: Optional[str] = Query(None, max_length=64),
    country: str = Query("US", max_length=8),
    radius_miles: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    start = time.perf_counter()

    monthly_income = 0.0

    try:
        from app.models.profile import Profile

        profile = (
            db.query(Profile)
            .filter(Profile.user_id == current_user.id)
            .first()
        )

        if profile and profile.monthly_income:
            monthly_income = float(profile.monthly_income)

        # Fall back to the caller's stored location when none is given.
        if latitude is None and profile:
            latitude = getattr(profile, "latitude", None)
        if longitude is None and profile:
            longitude = getattr(profile, "longitude", None)
        if state is None and profile:
            state = getattr(profile, "state", None)

    except Exception as e:
        logger.warning("Could not load profile for peer benchmark: %s", e)

    try:
        result = get_peer_benchmark(
            db=db,
            user_id=str(current_user.id),
            monthly_income=monthly_income,
            latitude=latitude,
            longitude=longitude,
            state=state,
            country=country,
            radius_miles=radius_miles,
        )

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return {
            "status": "success",
            "processing_ms": elapsed_ms,
            **result,
        }

    except Exception:
        # The previous version returned invented averages
        # (avg_monthly_income: 5000.0, avg_savings_rate: 0.14, ...)
        # alongside status="error". Any client that didn't check the
        # status field rendered fabricated peer data as real. In a
        # financial product that is worse than an error state.
        logger.exception("Peer benchmark failed for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Peer benchmark data is temporarily unavailable",
        )


# --------------------------------------------------
# GET /peers/map
# --------------------------------------------------

@router.get("/map")
def peer_map(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        clusters = get_peer_map_clusters(
            db=db,
            exclude_user_id=str(current_user.id),
            min_cluster_size=3,
        )

        return {"status": "success", "clusters": clusters}

    except Exception:
        logger.exception("Peer map failed for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Peer map data is temporarily unavailable",
        )