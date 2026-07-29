from __future__ import annotations

from typing import Optional
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.profile import Profile
from app.engines.peer_distribution import evaluate_peer_distribution


# --------------------------------------------------
# Haversine Distance (miles)
# --------------------------------------------------

def _haversine_miles(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """Calculate distance between two lat/long points in miles."""
    import math

    R = 3958.8  # Earth radius in miles

    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    return R * c


# --------------------------------------------------
# Query Peers from DB
# --------------------------------------------------

def _query_peers(
    db: Session,
    filters: list,
    min_peers: int = 10,
) -> list[Profile]:
    return db.query(Profile).filter(*filters).all()


def _compute_peer_stats(peers: list[Profile]) -> dict:
    """Compute aggregate stats from real peer profiles."""

    if not peers:
        return None

    incomes = [
        float(p.monthly_income)
        for p in peers
        if p.monthly_income
    ]

    savings = [
        float(p.savings_amount)
        for p in peers
        if p.savings_amount
    ]

    debts = [
        float(p.debt_amount)
        for p in peers
        if p.debt_amount
    ]

    emergency = [
        p.emergency_fund_months
        for p in peers
        if p.emergency_fund_months is not None
    ]

    def median(lst):
        if not lst:
            return 0.0
        s = sorted(lst)
        n = len(s)
        return s[n // 2] if n % 2 == 1 else (s[n//2 - 1] + s[n//2]) / 2

    avg_income = sum(incomes) / len(incomes) if incomes else 0.0
    median_income = median(incomes)

    # Estimate savings rate from income vs savings
    savings_rates = []
    for p in peers:
        if p.monthly_income and p.savings_amount:
            rate = float(p.savings_amount) / (float(p.monthly_income) * 12)
            savings_rates.append(min(rate, 1.0))

    avg_savings_rate = sum(savings_rates) / len(savings_rates) if savings_rates else 0.14

    return {
        "peer_count": len(peers),
        "avg_monthly_income": round(avg_income, 2),
        "median_monthly_income": round(median_income, 2),
        "avg_savings_rate": round(avg_savings_rate, 4),
        "avg_debt": round(sum(debts) / len(debts), 2) if debts else 0.0,
        "avg_emergency_fund_months": round(sum(emergency) / len(emergency), 1) if emergency else 0.0,
        "avg_savings_amount": round(sum(savings) / len(savings), 2) if savings else 0.0,
    }


# --------------------------------------------------
# Main Peer Benchmark Service
# --------------------------------------------------

def get_peer_benchmark(
    db: Session,
    user_id: str,
    monthly_income: float = 0,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    state: Optional[str] = None,
    country: str = "US",
    radius_miles: int = 50,
    min_peers: int = 5,
) -> dict:
    """
    Get peer benchmark stats for a user.

    Priority order:
    1. Local radius (lat/long within radius_miles)
    2. State-level
    3. National
    4. Global fallback
    5. Synthetic fallback (peer_distribution engine)
    """

    scope = "synthetic"
    peers = []

    # --------------------------------------------------
    # 1. LOCAL RADIUS (requires lat/long)
    # --------------------------------------------------

    if latitude and longitude:
        all_profiles = db.query(Profile).filter(
            Profile.user_id != user_id,
            Profile.latitude.isnot(None),
            Profile.longitude.isnot(None),
            Profile.monthly_income.isnot(None),
        ).all()

        local_peers = [
            p for p in all_profiles
            if _haversine_miles(
                latitude, longitude,
                float(p.latitude), float(p.longitude)
            ) <= radius_miles
        ]

        if len(local_peers) >= min_peers:
            peers = local_peers
            scope = f"local_{radius_miles}mi"

    # --------------------------------------------------
    # 2. STATE LEVEL
    # --------------------------------------------------

    if not peers and state:
        filters = [
            Profile.user_id != user_id,
            Profile.state == state,
            Profile.monthly_income.isnot(None),
        ]
        state_peers = _query_peers(db, filters)

        if len(state_peers) >= min_peers:
            peers = state_peers
            scope = f"state_{state}"

    # --------------------------------------------------
    # 3. NATIONAL
    # --------------------------------------------------

    if not peers:
        filters = [
            Profile.user_id != user_id,
            Profile.country == country,
            Profile.monthly_income.isnot(None),
        ]
        national_peers = _query_peers(db, filters)

        if len(national_peers) >= min_peers:
            peers = national_peers
            scope = "national"

    # --------------------------------------------------
    # 4. GLOBAL
    # --------------------------------------------------

    if not peers:
        filters = [
            Profile.user_id != user_id,
            Profile.monthly_income.isnot(None),
        ]
        global_peers = _query_peers(db, filters)

        if len(global_peers) >= min_peers:
            peers = global_peers
            scope = "global"

    # --------------------------------------------------
    # 5. REAL STATS (if we have real peers)
    # --------------------------------------------------

    if peers:
        stats = _compute_peer_stats(peers)

        if stats:
            # Run peer distribution engine with real data
            income = monthly_income or stats["avg_monthly_income"]

            distribution = evaluate_peer_distribution(
                income=income * 12,  # annual
                housing_ratio=0.28,
                car_payment_ratio=0.07,
                commitment_ratio=stats["avg_savings_rate"],
                savings_rate=stats["avg_savings_rate"],
            )

            return {
                "scope": scope,
                "data_source": "real",
                "peer_count": stats["peer_count"],
                "avg_monthly_income": stats["avg_monthly_income"],
                "median_monthly_income": stats["median_monthly_income"],
                "avg_savings_rate": stats["avg_savings_rate"],
                "avg_debt": stats["avg_debt"],
                "avg_emergency_fund_months": stats["avg_emergency_fund_months"],
                "avg_savings_amount": stats["avg_savings_amount"],
                "distribution": distribution,
            }

    # --------------------------------------------------
    # 6. SYNTHETIC FALLBACK (peer_distribution engine)
    # --------------------------------------------------

    income = monthly_income or 5000

    distribution = evaluate_peer_distribution(
        income=income * 12,
        housing_ratio=0.28,
        car_payment_ratio=0.07,
        commitment_ratio=0.36,
        savings_rate=0.14,
    )

    medians = distribution["peer_medians"]

    return {
        "scope": "synthetic",
        "data_source": "synthetic",
        "peer_count": distribution["population_size"],
        "avg_monthly_income": round(income, 2),
        "median_monthly_income": round(income * 0.95, 2),
        "avg_savings_rate": round(medians["savings_rate"], 4),
        "avg_debt": 18400.0,
        "avg_emergency_fund_months": 3.2,
        "avg_savings_amount": round(income * 12 * medians["savings_rate"], 2),
        "distribution": distribution,
    }