from __future__ import annotations
from typing import Optional, Tuple
from app.policy.context import FinancialContext
from app.policy.tax_profiles import estimate_effective_tax_rate


def resolve_net_monthly_income(
    ctx: FinancialContext,
) -> Tuple[Optional[float], Optional[float]]:
    """
    Returns:
        (net_monthly_income, effective_tax_rate_used)

    Contract:
    - If net income is provided → return it and tax rate = 0.0
    - If gross income is provided → compute net using tax model
    - If insufficient data → (None, None)

    Guarantees:
    - Never returns a None tax rate when net is computed
    - Never throws due to None math
    - Always clamps tax rate into safe range
    """

    # If user already supplied net income
    if ctx.net_monthly_income is not None:
        # Already net → no tax applied here
        return float(ctx.net_monthly_income), 0.0

    # If no gross income provided → cannot compute
    if ctx.gross_annual_income is None:
        return None, None

    gross = float(ctx.gross_annual_income)

    # Defensive guard
    if gross <= 0:
        return None, None

    # Estimate effective tax rate safely
    try:
        eff = estimate_effective_tax_rate(
            country=ctx.country,
            region=ctx.region,
            gross_annual_income=gross,
            employment_type=ctx.employment_type,
        )
    except Exception:
        # If tax model fails for any reason,
        # fallback to conservative global estimate
        eff = 0.20

    # If estimator somehow returns None
    if eff is None:
        eff = 0.20

    # Clamp tax rate to safe production bounds
    eff = max(0.0, min(0.75, float(eff)))

    # 4️⃣ Compute net
    net_annual = gross * (1.0 - eff)
    net_monthly = net_annual / 12.0

    return net_monthly, eff
