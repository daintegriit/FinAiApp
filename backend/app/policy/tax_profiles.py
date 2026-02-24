from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

@dataclass(frozen=True)
class TaxModel:
    """
    Production-grade approach:
    - Use effective tax rate estimation w/ brackets
    - Region overrides supported (US states, provinces, etc.)
    - Employment type adjustments (1099/self-employed)
    - Extensible to real tax engines later without breaking APIs
    """
    base_effective: float
    high_income_threshold: float
    high_effective: float
    self_employed_surcharge: float = 0.03  # placeholder for additional payroll/self-employment burden

# Country baseline effective tax models (approx; policy file is designed to evolve continuously)
COUNTRY_MODELS: Dict[str, TaxModel] = {
    "US": TaxModel(base_effective=0.18, high_income_threshold=120_000, high_effective=0.28),
    "GB": TaxModel(base_effective=0.22, high_income_threshold=100_000, high_effective=0.33),
    "DE": TaxModel(base_effective=0.30, high_income_threshold=90_000, high_effective=0.40),
    "FR": TaxModel(base_effective=0.28, high_income_threshold=95_000, high_effective=0.38),
    "CA": TaxModel(base_effective=0.20, high_income_threshold=110_000, high_effective=0.32),
    "AU": TaxModel(base_effective=0.22, high_income_threshold=110_000, high_effective=0.34),
    "IN": TaxModel(base_effective=0.12, high_income_threshold=20_00_000, high_effective=0.22),
    "AE": TaxModel(base_effective=0.03, high_income_threshold=250_000, high_effective=0.06),  # UAE-like low tax
}

# Region/state overrides (add as you expand; framework supports unlimited)
US_STATE_EFFECTIVE: Dict[str, Tuple[float, float]] = {
    # (base_add, high_add)
    "CA": (0.03, 0.05),
    "NY": (0.03, 0.05),
    "TX": (0.00, 0.00),
    "FL": (0.00, 0.00),
    "NJ": (0.02, 0.04),
}

def estimate_effective_tax_rate(country: str, region: Optional[str], gross_annual_income: float, employment_type: str) -> float:
    c = country.upper()
    model = COUNTRY_MODELS.get(c)
    if not model:
        # Safe global fallback (conservative)
        model = TaxModel(base_effective=0.20, high_income_threshold=120_000, high_effective=0.30)

    eff = model.base_effective if gross_annual_income < model.high_income_threshold else model.high_effective

    # Region adjustments (only implemented for US for now, but design supports others)
    if c == "US" and region:
        r = region.upper()
        add = US_STATE_EFFECTIVE.get(r)
        if add:
            eff += add[0] if gross_annual_income < model.high_income_threshold else add[1]

    # Employment type adjustments
    if employment_type in ("1099", "self_employed"):
        eff += model.self_employed_surcharge

    # Clamp
