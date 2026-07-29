from __future__ import annotations

from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.profile import Profile


# --------------------------------------------------
# Aggregate Peer Locations (City-Level, Anonymized)
# --------------------------------------------------

def get_peer_map_clusters(
    db: Session,
    exclude_user_id: str,
    min_cluster_size: int = 1,
) -> List[Dict[str, Any]]:
    """
    Returns city/state-level aggregated peer clusters for map display.
    No individual user data is exposed — only counts and averages
    per city/state group.
    """

    profiles = (
        db.query(Profile)
        .filter(
            Profile.user_id != exclude_user_id,
            Profile.latitude.isnot(None),
            Profile.longitude.isnot(None),
            Profile.city.isnot(None),
            Profile.state.isnot(None),
        )
        .all()
    )

    if not profiles:
        return []

    # Group by (city, state)
    groups: Dict[tuple, list] = {}

    for p in profiles:
        key = (p.city.strip().lower(), p.state.strip().lower())
        groups.setdefault(key, []).append(p)

    clusters: List[Dict[str, Any]] = []

    for (city, state), members in groups.items():

        if len(members) < min_cluster_size:
            continue

        lats = [float(m.latitude) for m in members]
        lngs = [float(m.longitude) for m in members]

        incomes = [
            float(m.monthly_income)
            for m in members
            if m.monthly_income
        ]

        savings = []
        for m in members:
            if m.monthly_income and m.savings_amount:
                rate = float(m.savings_amount) / (float(m.monthly_income) * 12)
                savings.append(min(rate, 1.0))

        clusters.append({
            "city": members[0].city,
            "state": members[0].state,
            "latitude": round(sum(lats) / len(lats), 3),
            "longitude": round(sum(lngs) / len(lngs), 3),
            "peer_count": len(members),
            "avg_monthly_income": round(sum(incomes) / len(incomes), 2) if incomes else None,
            "avg_savings_rate": round(sum(savings) / len(savings), 4) if savings else None,
        })

    return clusters