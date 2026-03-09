from __future__ import annotations

import time
import uuid
import random
from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field

from app.schemas.commitment_lock import CommitmentLockRequest
from app.engines.commitment_lock import evaluate_commitment_lock
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "peer_trajectory_v1"


# --------------------------------------------------
# Models
# --------------------------------------------------

class PeerTrajectoryPoint(BaseModel):
    years: int
    user_projected_wealth: float
    peer_median_wealth: float
    peer_p25_wealth: float
    peer_p75_wealth: float
    wealth_gap: float

    model_config = {"frozen": True}


class PeerTrajectoryBand(BaseModel):
    label: Literal["ahead", "aligned", "lagging", "materially_lagging"]
    min_score: int = Field(..., ge=0, le=100)
    max_score: int = Field(..., ge=0, le=100)

    model_config = {"frozen": True}


class PeerTrajectoryResponse(BaseModel):
    schema_version: str = "1.0"
    engine_version: str

    request_id: str
    calculation_timestamp: datetime
    processing_ms: int

    trajectory_score: int = Field(..., ge=0, le=100)
    trajectory_band: PeerTrajectoryBand

    points: List[PeerTrajectoryPoint]

    estimated_peer_gap_20y: float
    estimated_peer_gap_30y: float

    policy_versions: dict[str, str]
    supporting_engines: dict[str, object]

    summary: str
    recommendations: List[str]

    model_config = {"frozen": True}


# --------------------------------------------------
# Utilities
# --------------------------------------------------

def _clamp(x: float, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, int(round(x))))


def _percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    idx = int((len(values) - 1) * p)
    return values[idx]


def _future_value(monthly: float, years: int, annual_return: float) -> float:
    r = annual_return / 12.0
    n = years * 12
    if r <= 0:
        return monthly * n
    return monthly * (((1 + r) ** n - 1) / r)


def _band(score: int) -> PeerTrajectoryBand:
    if score >= 70:
        return PeerTrajectoryBand(label="ahead", min_score=70, max_score=100)
    if score >= 50:
        return PeerTrajectoryBand(label="aligned", min_score=50, max_score=69)
    if score >= 30:
        return PeerTrajectoryBand(label="lagging", min_score=30, max_score=49)
    return PeerTrajectoryBand(label="materially_lagging", min_score=0, max_score=29)


def _summary(label: str, gap20: float, gap30: float) -> str:
    if label == "ahead":
        return (
            f"Relative to simulated peers, the current financial trajectory appears ahead. "
            f"Projected wealth advantage is approximately {gap20:,.0f} at 20 years and {gap30:,.0f} at 30 years."
        )

    if label == "aligned":
        return (
            f"Relative to simulated peers, the current trajectory appears broadly aligned. "
            f"Projected wealth differences remain modest over 20- and 30-year horizons."
        )

    if label == "lagging":
        return (
            f"Relative to simulated peers, the current trajectory appears somewhat behind. "
            f"Projected wealth gap is approximately {abs(gap20):,.0f} at 20 years and {abs(gap30):,.0f} at 30 years."
        )

    return (
        f"Relative to simulated peers, the current trajectory appears materially behind. "
        f"Projected wealth shortfall is approximately {abs(gap20):,.0f} at 20 years and {abs(gap30):,.0f} at 30 years."
    )


def _recommendations(label: str) -> List[str]:
    recs: List[str] = []

    if label == "materially_lagging":
        recs.append("Reducing recurring commitments could materially improve long-term wealth positioning versus peers.")
        recs.append("Increasing monthly investable surplus may help close the long-horizon wealth gap.")

    elif label == "lagging":
        recs.append("Incremental improvements to savings or recurring cost reduction may improve trajectory relative to peers.")

    else:
        recs.append("Current trajectory appears competitive relative to peers. Maintaining consistency is valuable.")

    return recs


# --------------------------------------------------
# Peer Simulation
# --------------------------------------------------

def _simulate_peer_monthly_contributions(user_monthly_payment: float, sample_size: int = 1000) -> List[float]:
    """
    Synthetic peers: assume similar users typically commit somewhat less than a high recurring burden user
    and invest some comparable discretionary amount instead.
    """
    values: List[float] = []

    base = max(50.0, user_monthly_payment * 0.75)

    for _ in range(sample_size):
        noise = random.uniform(0.65, 1.35)
        values.append(max(25.0, base * noise))

    values.sort()
    return values


# --------------------------------------------------
# Engine
# --------------------------------------------------

def evaluate_peer_trajectory(req: CommitmentLockRequest) -> PeerTrajectoryResponse:
    start = time.perf_counter()

    request_id = str(uuid.uuid4())
    timestamp = datetime.utcnow()

    raw_policy_versions = get_policy_versions()
    policy_versions = dict(raw_policy_versions) if raw_policy_versions else {}

    commitment = evaluate_commitment_lock(req)

    annual_return = getattr(req, "annual_return_assumption", None) or 0.07
    monthly_payment = float(req.monthly_payment)

    horizons = [5, 10, 20, 30]
    peer_monthly_distribution = _simulate_peer_monthly_contributions(monthly_payment)

    points: List[PeerTrajectoryPoint] = []

    gap20 = 0.0
    gap30 = 0.0

    for years in horizons:
        user_projected = _future_value(monthly_payment, years, annual_return)

        peer_paths = [
            _future_value(m, years, annual_return)
            for m in peer_monthly_distribution
        ]
        peer_paths.sort()

        peer_median = _percentile(peer_paths, 0.50)
        peer_p25 = _percentile(peer_paths, 0.25)
        peer_p75 = _percentile(peer_paths, 0.75)

        gap = user_projected - peer_median

        if years == 20:
            gap20 = gap
        if years == 30:
            gap30 = gap

        points.append(
            PeerTrajectoryPoint(
                years=years,
                user_projected_wealth=round(user_projected, 2),
                peer_median_wealth=round(peer_median, 2),
                peer_p25_wealth=round(peer_p25, 2),
                peer_p75_wealth=round(peer_p75, 2),
                wealth_gap=round(gap, 2),
            )
        )

    # Positive gap = ahead, negative gap = behind
    if gap30 >= 100_000:
        score = 80
    elif gap30 >= 0:
        score = 60
    elif gap30 >= -100_000:
        score = 40
    else:
        score = 20

    trajectory_score = _clamp(score)
    trajectory_band = _band(trajectory_score)

    summary = _summary(trajectory_band.label, gap20, gap30)
    recommendations = _recommendations(trajectory_band.label)

    processing_ms = int((time.perf_counter() - start) * 1000)

    return PeerTrajectoryResponse(
        engine_version=ENGINE_VERSION,
        request_id=request_id,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        trajectory_score=trajectory_score,
        trajectory_band=trajectory_band,
        points=points,
        estimated_peer_gap_20y=round(gap20, 2),
        estimated_peer_gap_30y=round(gap30, 2),
        policy_versions=policy_versions,
        supporting_engines={
            "commitment_lock": commitment,
        },
        summary=summary,
        recommendations=recommendations,
    )