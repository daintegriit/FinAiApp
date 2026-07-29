
import time
import logging

from fastapi import APIRouter, HTTPException, status, Depends

from app.dashboard.aggregator import build_dashboard
from app.schemas.dashboard import DashboardRequest, DashboardResponse

# Optional future dependencies
# from app.auth.dependencies import get_current_user
# from app.db.session import get_db
# from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


# --------------------------------------------------
# Dashboard Snapshot
# --------------------------------------------------

@router.post(
    "/snapshot",
    response_model=DashboardResponse,
    summary="Generate full financial dashboard snapshot",
)
def snapshot(
    req: DashboardRequest,
    # user = Depends(get_current_user),
    # db: Session = Depends(get_db),
) -> DashboardResponse:
    """
    Build a unified dashboard view of the user's financial system.

    Combines:
    - financial profile
    - portfolio allocation
    - commitment lock analysis
    - benchmark comparison
    - scenario projections
    """

    start = time.perf_counter()

    try:

        logger.info("Dashboard generation started")

        dashboard = build_dashboard(req)

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if hasattr(dashboard, "processing_ms"):
            dashboard.processing_ms = elapsed_ms

        logger.info(
            "Dashboard generated in %sms",
            elapsed_ms
        )

        return dashboard

    # --------------------------------------------------
    # Validation Errors
    # --------------------------------------------------

    except ValueError as e:

        logger.warning(
            "Dashboard validation error: %s",
            str(e)
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # --------------------------------------------------
    # System Errors
    # --------------------------------------------------

    except Exception as e:

        logger.exception("Dashboard generation failure")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Dashboard generation failed",
                "message": str(e),
            },
        )