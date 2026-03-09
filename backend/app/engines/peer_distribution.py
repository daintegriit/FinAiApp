from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, List


ENGINE_VERSION = "peer_distribution_engine_v1"


# --------------------------------------------------
# Data Model
# --------------------------------------------------

@dataclass
class PeerProfile:
    income: float
    housing_ratio: float
    car_payment_ratio: float
    commitment_ratio: float
    savings_rate: float


# --------------------------------------------------
# Synthetic Peer Population
# --------------------------------------------------

def generate_peer_population(
    income: float,
    size: int = 2000
) -> List[PeerProfile]:
    """
    Generate a synthetic peer population centered around
    a given income level.

    Uses distributions loosely inspired by
    public consumer finance datasets.
    """

    peers: List[PeerProfile] = []

    for _ in range(size):

        income_noise = random.uniform(0.7, 1.3)
        peer_income = income * income_noise

        housing_ratio = random.gauss(0.28, 0.08)
        car_ratio = random.gauss(0.07, 0.04)
        commitment_ratio = random.gauss(0.36, 0.10)
        savings_rate = random.gauss(0.14, 0.06)

        # Clamp values
        housing_ratio = max(0.05, min(housing_ratio, 0.6))
        car_ratio = max(0.0, min(car_ratio, 0.25))
        commitment_ratio = max(0.05, min(commitment_ratio, 0.9))
        savings_rate = max(-0.1, min(savings_rate, 0.5))

        peers.append(
            PeerProfile(
                income=peer_income,
                housing_ratio=housing_ratio,
                car_payment_ratio=car_ratio,
                commitment_ratio=commitment_ratio,
                savings_rate=savings_rate
            )
        )

    return peers


# --------------------------------------------------
# Percentile Utility
# --------------------------------------------------

def percentile(value: float, population: List[float]) -> float:
    """
    Compute percentile rank of a value within a population.
    """

    if not population:
        return 50.0

    below = sum(1 for x in population if x <= value)

    return round((below / len(population)) * 100, 2)


# --------------------------------------------------
# Distribution Extraction
# --------------------------------------------------

def extract_distribution(peers: List[PeerProfile], field: str) -> List[float]:

    return [getattr(p, field) for p in peers]


# --------------------------------------------------
# Public Engine
# --------------------------------------------------

def evaluate_peer_distribution(
    income: float,
    housing_ratio: float,
    car_payment_ratio: float,
    commitment_ratio: float,
    savings_rate: float
) -> Dict:

    peers = generate_peer_population(income)

    housing_dist = extract_distribution(peers, "housing_ratio")
    car_dist = extract_distribution(peers, "car_payment_ratio")
    commitment_dist = extract_distribution(peers, "commitment_ratio")
    savings_dist = extract_distribution(peers, "savings_rate")

    return {

        "engine_version": ENGINE_VERSION,

        "percentiles": {

            "housing_ratio": percentile(housing_ratio, housing_dist),

            "car_payment_ratio": percentile(car_payment_ratio, car_dist),

            "commitment_ratio": percentile(commitment_ratio, commitment_dist),

            "savings_rate": percentile(savings_rate, savings_dist),
        },

        "peer_medians": {

            "housing_ratio": round(sorted(housing_dist)[len(housing_dist)//2], 3),

            "car_payment_ratio": round(sorted(car_dist)[len(car_dist)//2], 3),

            "commitment_ratio": round(sorted(commitment_dist)[len(commitment_dist)//2], 3),

            "savings_rate": round(sorted(savings_dist)[len(savings_dist)//2], 3),
        },

        "population_size": len(peers)
    }