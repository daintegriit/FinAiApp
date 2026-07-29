from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Any

import pycountry

#Trying to beat companies like SphereAI Global engine buyt they are not focusing on personal finance

# =========================================================
# POLICY VERSIONING (audit + reproducibility)
# =========================================================
TAX_POLICY_VERSION = "tax-policy-2026.03.05"


# =========================================================
# DATA MODELS
# =========================================================

@dataclass(frozen=True)
class TaxModel:
    """
    Production-grade structure (extensible):
    - Uses an effective-rate model with a high-income step-up.
    - Region overrides supported (e.g., US states).
    - Employment type adjustments supported (e.g., self-employed surcharge).
    - Designed to be replaced by bracket-based engines later WITHOUT breaking APIs.
    """
    base_effective: float                 # baseline effective tax rate
    high_income_threshold: float          # threshold where high_effective applies
    high_effective: float                 # effective rate above threshold
    self_employed_surcharge: float = 0.03 # placeholder for self-employment/payload burden


@dataclass(frozen=True)
class TaxEstimate:
    """
    Audit-grade output. Use this internally and expose selectively in responses.
    """
    effective_rate: float
    model_used: str
    policy_version: str
    fallback_used: bool
    confidence: str  # "low" | "medium" | "high"
    breakdown: Dict[str, float]
    notes: Dict[str, Any]


# =========================================================
# HELPERS
# =========================================================

def _is_valid_iso_country(country: str) -> bool:
    """
    Validate ISO 3166-1 alpha-2 (e.g., US, DE, AE).
    Accepts 'ZZ' as unknown but discouraged.
    """
    if not country or not isinstance(country, str):
        return False
    c = country.strip().upper()
    if c == "ZZ":
        return True
    return pycountry.countries.get(alpha_2=c) is not None


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def _normalize_country(country: str) -> str:
    c = (country or "").strip().upper()
    return c if c else "ZZ"


def _normalize_region(region: Optional[str]) -> Optional[str]:
    if not region:
        return None
    r = region.strip().upper()
    return r if r else None


def _normalize_employment(employment_type: Optional[str]) -> str:
    """
    Normalize employment labels.
    Supported common tags:
      - "w2", "salary", "employee"
      - "1099", "self_employed", "contractor"
    """
    if not employment_type:
        return "w2"
    e = employment_type.strip().lower()
    if e in ("full_time", "salary", "employee", "w2"):
        return "w2"
    if e in ("part_time",):
        return "w2"  # treat part-time as w2 for tax purposes
    if e in ("freelance", "contract", "1099", "self-employed", "self_employed", "contractor"):
        return "self_employed"
    return "w2"  # default to w2 if unrecognized


# =========================================================
# BASELINE COUNTRY MODELS (effective rate approximations)
#
# IMPORTANT:
# - This is not "tax law". This is a conservative modeling layer.
# - Correctness here means: transparent, versioned, and never silent.
# - Add/override countries as we mature; the framework supports it.
# =========================================================

COUNTRY_MODELS: Dict[str, TaxModel] = {
    # United States (federal+payroll approx; states handled separately)
    "US": TaxModel(base_effective=0.18, high_income_threshold=120_000, high_effective=0.28),

    # United Kingdom
    "GB": TaxModel(base_effective=0.22, high_income_threshold=100_000, high_effective=0.33),

    # Germany
    "DE": TaxModel(base_effective=0.30, high_income_threshold=90_000, high_effective=0.40),

    # France
    "FR": TaxModel(base_effective=0.28, high_income_threshold=95_000, high_effective=0.38),

    # Canada (federal+prov blended approximation)
    "CA": TaxModel(base_effective=0.20, high_income_threshold=110_000, high_effective=0.32),

    # Australia
    "AU": TaxModel(base_effective=0.22, high_income_threshold=110_000, high_effective=0.34),

    # India (note: thresholds here are placeholders; you can refine as you add slab logic)
    "IN": TaxModel(base_effective=0.12, high_income_threshold=2_000_000, high_effective=0.22),

    # United Arab Emirates
    # For individuals: income tax is generally 0% (model this as 0).
    "AE": TaxModel(base_effective=0.00, high_income_threshold=250_000, high_effective=0.00),
}

# Conservative global fallback (works for ALL countries)
FALLBACK_MODEL = TaxModel(base_effective=0.20, high_income_threshold=120_000, high_effective=0.30)


# =========================================================
# REGION OVERRIDES (framework supports unlimited)
# - For now: US state add-ons (effective rate bumps)
# =========================================================

US_STATE_EFFECTIVE_ADD: Dict[str, Tuple[float, float]] = {
    # (base_add, high_add)
    "CA": (0.03, 0.05),
    "NY": (0.03, 0.05),
    "TX": (0.00, 0.00),
    "FL": (0.00, 0.00),
    "NJ": (0.02, 0.04),
}


# =========================================================
# PUBLIC API (BACKWARD COMPATIBLE)
# =========================================================

def estimate_effective_tax_rate(
    country: str,
    region: Optional[str],
    gross_annual_income: float,
    employment_type: Optional[str],
) -> float:
    """
    Backward compatible: returns only the effective rate (float).
    Use estimate_tax(...) if you want audit-grade metadata.
    """
    est = estimate_tax(
        country=country,
        region=region,
        gross_annual_income=gross_annual_income,
        employment_type=employment_type,
    )
    return est.effective_rate


# =========================================================
# AUDIT-GRADE TAX ESTIMATION
# =========================================================

def estimate_tax(
    country: str,
    region: Optional[str],
    gross_annual_income: float,
    employment_type: Optional[str],
) -> TaxEstimate:
    """
    Returns a TaxEstimate with:
      - effective_rate
      - model_used / policy_version
      - fallback_used / confidence
      - breakdown + notes (for explainability)
    """
    c = _normalize_country(country)
    r = _normalize_region(region)
    emp = _normalize_employment(employment_type)

    # Validate ISO country (global correctness)
    # We still return a safe result even if invalid, but we mark it clearly.
    iso_ok = _is_valid_iso_country(c)

    model = COUNTRY_MODELS.get(c)
    fallback_used = False
    confidence = "medium"

    if model is None:
        model = FALLBACK_MODEL
        fallback_used = True
        confidence = "low"

    # Income sanity
    gross = float(gross_annual_income or 0.0)
    if gross <= 0:
        # If income is missing/invalid, return conservative defaults
        eff = model.base_effective
        fallback_used = True
        confidence = "low"
        breakdown = {"income_tax_effective": eff}
        notes = {
            "warning": "gross_annual_income_missing_or_nonpositive",
            "iso_country_valid": iso_ok,
            "employment_type_normalized": emp,
        }
        return TaxEstimate(
            effective_rate=_clamp(eff, 0.0, 0.75),
            model_used=("fallback_effective_rate_v1" if fallback_used else "effective_rate_v1"),
            policy_version=TAX_POLICY_VERSION,
            fallback_used=True,
            confidence=confidence,
            breakdown=breakdown,
            notes=notes,
        )

    # Base effective rate selection
    eff = model.base_effective if gross < model.high_income_threshold else model.high_effective

    breakdown: Dict[str, float] = {
        "income_tax_effective": eff,
    }
    notes: Dict[str, Any] = {
        "iso_country_valid": iso_ok,
        "employment_type_normalized": emp,
        "country_model_used": c if c in COUNTRY_MODELS else "FALLBACK_MODEL",
    }

    # Region adjustments (US state add-ons for now)
    if c == "US" and r:
        add = US_STATE_EFFECTIVE_ADD.get(r)
        if add:
            bump = add[0] if gross < model.high_income_threshold else add[1]
            eff += bump
            breakdown["region_addon_effective"] = bump
            notes["region_rule_applied"] = f"US_STATE_EFFECTIVE_ADD:{r}"
        else:
            notes["region_rule_applied"] = "US_STATE_EFFECTIVE_ADD:none"

    # Employment type adjustments
    if emp == "self_employed":
        eff += model.self_employed_surcharge
        breakdown["self_employed_surcharge"] = model.self_employed_surcharge
        notes["employment_adjustment"] = "self_employed_surcharge_applied"
    else:
        notes["employment_adjustment"] = "none"

    # ISO invalid countries: still return a value, but mark confidence low
    if not iso_ok:
        fallback_used = True
        confidence = "low"
        notes["warning"] = "invalid_iso_country_code_used"

    # Clamp for safety (don’t ever output absurd tax rates)
    eff = _clamp(eff, 0.0, 0.75)

    model_used = "effective_rate_v1"
    if c not in COUNTRY_MODELS:
        model_used = "fallback_effective_rate_v1"

    return TaxEstimate(
        effective_rate=eff,
        model_used=model_used,
        policy_version=TAX_POLICY_VERSION,
        fallback_used=fallback_used,
        confidence=confidence,
        breakdown=breakdown,
        notes=notes,
    )