
import csv
import io
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.password_utils import hash_password
from app.db.session import get_db
from app.models.categories import Category
from app.models.profile import Profile
from app.models.push_token import PushToken
from app.models.simulation import Simulation
from app.models.transactions import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# ======================================================
# SCHEMAS
# ======================================================

class AdminUserSummary(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    is_admin: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    monthly_income: Optional[float] = None
    financial_goal: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserDetail(AdminUserSummary):
    age: Optional[int] = None
    country: Optional[str] = None
    employment_type: Optional[str] = None
    risk_tolerance: Optional[str] = None
    savings_amount: Optional[float] = None
    debt_amount: Optional[float] = None
    emergency_fund_months: Optional[int] = None
    income_stability: Optional[str] = None
    lifestyle: Optional[str] = None
    transaction_count: int = 0
    simulation_count: int = 0
    category_count: int = 0


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    verified_users: int
    admin_users: int
    new_users_today: int
    new_users_this_week: int
    total_transactions: int
    total_simulations: int
    total_categories: int
    avg_income: Optional[float] = None
    users_with_profiles: int = 0
    users_with_location: int = 0


class BroadcastPushRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


class SinglePushRequest(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None


class FeatureFlagUpdate(BaseModel):
    flags: Dict[str, bool]


class PromoteRequest(BaseModel):
    is_admin: bool


class ResetPasswordRequest(BaseModel):
    new_password: str


# ======================================================
# HELPERS
# ======================================================

def _build_user_summary(user: User, profile: Optional[Profile]) -> AdminUserSummary:
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login=getattr(user, "last_login", None),
        monthly_income=float(profile.monthly_income) if profile and profile.monthly_income else None,
        financial_goal=profile.financial_goal if profile else None,
        city=profile.city if profile else None,
        state=profile.state if profile else None,
    )


async def _send_expo_push(tokens: List[str], title: str, body: str, data: Optional[Dict] = None) -> Dict:
    if not tokens:
        return {"sent": 0, "errors": 0}

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        for token in tokens
    ]

    sent = 0
    errors = 0

    async with httpx.AsyncClient() as client:
        for i in range(0, len(messages), 100):
            batch = messages[i:i + 100]
            try:
                res = await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=batch,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    timeout=30,
                )
                result = res.json()
                data_list = result.get("data", [])
                for item in data_list:
                    if item.get("status") == "ok":
                        sent += 1
                    else:
                        errors += 1
            except Exception as e:
                logger.error(f"Push batch failed: {e}")
                errors += len(batch)

    return {"sent": sent, "errors": errors}


# In-memory feature flags (persisted per process — good enough for now)
_FEATURE_FLAGS: Dict[str, bool] = {
    "peer_benchmarks": True,
    "financial_simulations": True,
    "push_notifications": True,
    "new_user_registration": True,
    "globe_markers": True,
}


# ======================================================
# GET /admin/stats
# ======================================================

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
    new_today = db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar() or 0
    new_this_week = db.query(func.count(User.id)).filter(User.created_at >= week_start).scalar() or 0

    try:
        total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    except Exception:
        total_transactions = 0

    try:
        total_simulations = db.query(func.count(Simulation.id)).scalar() or 0
    except Exception:
        total_simulations = 0

    try:
        total_categories = db.query(func.count(Category.id)).scalar() or 0
    except Exception:
        total_categories = 0

    try:
        avg_income_result = db.query(func.avg(Profile.monthly_income)).scalar()
        avg_income = float(avg_income_result) if avg_income_result else None
    except Exception:
        avg_income = None

    try:
        users_with_profiles = db.query(func.count(Profile.id)).scalar() or 0
    except Exception:
        users_with_profiles = 0

    try:
        users_with_location = db.query(func.count(Profile.id)).filter(
            Profile.latitude.isnot(None),
            Profile.longitude.isnot(None),
        ).scalar() or 0
    except Exception:
        users_with_location = 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        verified_users=verified_users,
        admin_users=admin_users,
        new_users_today=new_today,
        new_users_this_week=new_this_week,
        total_transactions=total_transactions,
        total_simulations=total_simulations,
        total_categories=total_categories,
        avg_income=avg_income,
        users_with_profiles=users_with_profiles,
        users_with_location=users_with_location,
    )


# ======================================================
# GET /admin/users
# ======================================================

@router.get("/users", response_model=List[AdminUserSummary])
def list_all_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, le=500),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(User)
    if search:
        query = query.filter(
            User.email.ilike(f"%{search}%") |
            User.username.ilike(f"%{search}%")
        )

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        result.append(_build_user_summary(user, profile))

    return result


# ======================================================
# GET /admin/users/{user_id}
# ======================================================

@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(Profile).filter(Profile.user_id == user.id).first()

    try:
        tx_count = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id).scalar() or 0
    except Exception:
        tx_count = 0

    try:
        sim_count = db.query(func.count(Simulation.id)).filter(Simulation.user_id == user_id).scalar() or 0
    except Exception:
        sim_count = 0

    try:
        cat_count = db.query(func.count(Category.id)).filter(Category.user_id == user_id).scalar() or 0
    except Exception:
        cat_count = 0

    return AdminUserDetail(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        is_admin=user.is_admin,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login=getattr(user, "last_login", None),
        monthly_income=float(profile.monthly_income) if profile and profile.monthly_income else None,
        financial_goal=profile.financial_goal if profile else None,
        city=profile.city if profile else None,
        state=profile.state if profile else None,
        age=profile.age if profile else None,
        country=profile.country if profile else None,
        employment_type=profile.employment_type if profile else None,
        risk_tolerance=profile.risk_tolerance if profile else None,
        savings_amount=float(profile.savings_amount) if profile and profile.savings_amount else None,
        debt_amount=float(profile.debt_amount) if profile and profile.debt_amount else None,
        emergency_fund_months=profile.emergency_fund_months if profile else None,
        income_stability=profile.income_stability if profile else None,
        lifestyle=profile.lifestyle if profile else None,
        transaction_count=tx_count,
        simulation_count=sim_count,
        category_count=cat_count,
    )


# ======================================================
# POST /admin/users/{user_id}/ban
# ======================================================

@router.post("/users/{user_id}/ban")
def ban_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot ban yourself")

    user.is_active = False
    db.commit()
    return {"status": "success", "message": f"{user.email} has been banned"}


# ======================================================
# POST /admin/users/{user_id}/unban
# ======================================================

@router.post("/users/{user_id}/unban")
def unban_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()
    return {"status": "success", "message": f"{user.email} has been unbanned"}


# ======================================================
# POST /admin/users/{user_id}/promote
# ======================================================

@router.post("/users/{user_id}/promote")
def promote_user(
    user_id: str,
    payload: PromoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")

    user.is_admin = payload.is_admin
    db.commit()

    action = "promoted to admin" if payload.is_admin else "demoted from admin"
    return {"status": "success", "message": f"{user.email} {action}"}


# ======================================================
# POST /admin/users/{user_id}/reset-password
# ======================================================

@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = hash_password(payload.new_password[:72])
    db.commit()

    return {"status": "success", "message": f"Password reset for {user.email}"}


# ======================================================
# POST /admin/users/{user_id}/push
# ======================================================

@router.post("/users/{user_id}/push")
async def send_push_to_user(
    user_id: str,
    payload: SinglePushRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    token_record = db.query(PushToken).filter(
        PushToken.user_id == user_id
    ).first()

    if not token_record:
        raise HTTPException(status_code=404, detail="No push token for this user")

    result = await _send_expo_push(
        tokens=[token_record.push_token],
        title=payload.title,
        body=payload.body,
        data=payload.data,
    )

    return {"status": "success", **result}


# ======================================================
# POST /admin/push/broadcast
# ======================================================

@router.post("/push/broadcast")
async def broadcast_push(
    payload: BroadcastPushRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # Only send to active users
    active_user_ids = [
        str(u.id) for u in
        db.query(User).filter(User.is_active == True).all()
    ]

    tokens = [
        t.push_token for t in
        db.query(PushToken).filter(
            PushToken.user_id.in_(active_user_ids)
        ).all()
    ]

    if not tokens:
        return {"status": "success", "sent": 0, "errors": 0, "message": "No push tokens found"}

    result = await _send_expo_push(
        tokens=tokens,
        title=payload.title,
        body=payload.body,
        data=payload.data,
    )

    logger.info(f"Admin broadcast by {admin.email}: {result}")
    return {"status": "success", **result, "total_tokens": len(tokens)}


# ======================================================
# DELETE /admin/users/{user_id}
# ======================================================

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    try:
        db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)
        db.query(Category).filter(Category.user_id == user_id).delete(synchronize_session=False)
        db.query(Simulation).filter(Simulation.user_id == user_id).delete(synchronize_session=False)
        db.query(PushToken).filter(PushToken.user_id == user_id).delete(synchronize_session=False)
        db.query(Profile).filter(Profile.user_id == user_id).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Error cleaning up related data: {e}")

    db.delete(user)
    db.commit()

    return {"status": "success", "message": f"User {user_id} permanently deleted"}


# ======================================================
# GET /admin/export/users  (CSV)
# ======================================================

@router.get("/export/users")
def export_users_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "id", "email", "username", "is_active", "is_admin",
        "is_verified", "created_at", "city", "state",
        "monthly_income", "financial_goal", "age", "employment_type",
    ])

    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        writer.writerow([
            str(user.id),
            user.email,
            user.username,
            user.is_active,
            user.is_admin,
            user.is_verified,
            user.created_at.isoformat() if user.created_at else "",
            profile.city if profile else "",
            profile.state if profile else "",
            float(profile.monthly_income) if profile and profile.monthly_income else "",
            profile.financial_goal if profile else "",
            profile.age if profile else "",
            profile.employment_type if profile else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=finbudgetai_users.csv"},
    )


# ======================================================
# GET /admin/feature-flags
# ======================================================

@router.get("/feature-flags")
def get_feature_flags(
    admin: User = Depends(require_admin),
):
    return {"flags": _FEATURE_FLAGS}


# ======================================================
# PATCH /admin/feature-flags
# ======================================================

@router.patch("/feature-flags")
def update_feature_flags(
    payload: FeatureFlagUpdate,
    admin: User = Depends(require_admin),
):
    for key, value in payload.flags.items():
        if key in _FEATURE_FLAGS:
            _FEATURE_FLAGS[key] = value
            logger.info(f"Admin {admin.email} set feature flag {key}={value}")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown flag: {key}")

    return {"status": "success", "flags": _FEATURE_FLAGS}


# ======================================================
# GET /admin/health
# ======================================================

@router.get("/health")
def admin_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    checks = {}

    # DB connectivity
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Table row counts
    try:
        checks["user_count"] = db.query(func.count(User.id)).scalar()
        checks["transaction_count"] = db.query(func.count(Transaction.id)).scalar()
        checks["simulation_count"] = db.query(func.count(Simulation.id)).scalar()
        checks["push_token_count"] = db.query(func.count(PushToken.id)).scalar()
    except Exception as e:
        checks["counts_error"] = str(e)

    # Push token coverage
    try:
        total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        total_tokens = db.query(func.count(PushToken.id)).scalar() or 0
        checks["push_coverage_pct"] = round((total_tokens / total_users) * 100, 1) if total_users > 0 else 0
    except Exception:
        checks["push_coverage_pct"] = 0

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }