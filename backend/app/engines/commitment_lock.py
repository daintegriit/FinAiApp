from __future__ import annotations

from typing import Optional, List, Tuple
import math
import time
import uuid
from datetime import datetime

from app.core.config import settings
from app.schemas.commitment_lock import (
    CommitmentLockRequest,
    CommitmentLockResponse,
    ReasonCode,
    Assumptions,
    PolicyVersions,
)

from app.policy.resolver import resolve_net_monthly_income
from app.policy.tax_models.policy_registry import get_policy_versions


ENGINE_VERSION = "commitment_lock_v1"


def _monthly_rate(annual_rate: float) -> float:
    return (1.0 + annual_rate) ** (1.0 / 12.0) - 1.0


def future_value_of_annuity(payment: float, months: int, annual_return: float) -> float:

    r = _monthly_rate(annual_return)

    if r <= 0:
        return payment * months

    return payment * (((1.0 + r) ** months - 1.0) / r)


def inflation_adjust(value: float, months: int, annual_inflation: float) -> float:

    r = _monthly_rate(annual_inflation)

    return value / ((1.0 + r) ** months)


def clamp_int(x: float, lo: int, hi: int) -> int:

    return max(lo, min(hi, int(round(x))))


def compute_goal_delay_months(
    monthly_payment: float,
    goal_cost: float,
    goal_monthly_contribution: float,
) -> Optional[int]:

    old_c = goal_monthly_contribution
    new_c = max(goal_monthly_contribution - monthly_payment, 0.0)

    old_months = math.ceil(goal_cost / old_c) if old_c > 0 else None
    new_months = math.ceil(goal_cost / new_c) if new_c > 0 else None

    if old_months is None:
        return None

    if new_months is None:
        return 10_000

    return max(0, new_months - old_months)


def lock_score_and_reasons(
    monthly_payment: float,
    term_months: int,
    net_income: Optional[float],
    free_cashflow: Optional[float],
) -> Tuple[int, List[ReasonCode]]:

    reasons: List[ReasonCode] = []

    score = 0

    if term_months >= 72:
        score += 25
        reasons.append(
            ReasonCode(
                code="TERM_LONG",
                severity="high",
                message="Long commitment term increases lock-in risk.",
            )
        )

    elif term_months >= 48:

        score += 15

        reasons.append(
            ReasonCode(
                code="TERM_MEDIUM",
                severity="medium",
                message="Medium-term commitment increases rigidity.",
            )
        )

    if net_income is not None and net_income > 0:

        share = monthly_payment / net_income

        if share >= 0.25:

            score += 35

            reasons.append(
                ReasonCode(
                    code="INCOME_SHARE_HIGH",
                    severity="high",
                    message="Commitment consumes a large share of monthly income.",
                )
            )

        elif share >= 0.15:

            score += 22

            reasons.append(
                ReasonCode(
                    code="INCOME_SHARE_MED",
                    severity="medium",
                    message="Commitment consumes a meaningful share of monthly income.",
                )
            )

        elif share >= 0.08:

            score += 10

            reasons.append(
                ReasonCode(
                    code="INCOME_SHARE_LOW",
                    severity="low",
                    message="Commitment meaningfully reduces monthly flexibility.",
                )
            )

    if free_cashflow is not None and free_cashflow > 0:

        fc_share = monthly_payment / free_cashflow

        if fc_share >= 0.8:

            score += 40

            reasons.append(
                ReasonCode(
                    code="FREE_CASHFLOW_CRITICAL",
                    severity="high",
                    message="Commitment consumes most of your free cashflow.",
                )
            )

        elif fc_share >= 0.5:

            score += 25

            reasons.append(
                ReasonCode(
                    code="FREE_CASHFLOW_HIGH",
                    severity="high",
                    message="Commitment consumes a large portion of free cashflow.",
                )
            )

        elif fc_share >= 0.3:

            score += 12

            reasons.append(
                ReasonCode(
                    code="FREE_CASHFLOW_MED",
                    severity="medium",
                    message="Commitment reduces monthly buffer.",
                )
            )

    score += 5

    if not reasons:

        reasons.append(
            ReasonCode(
                code="LOCK_PRESENT",
                severity="low",
                message="Recurring commitments reduce optionality.",
            )
        )

    return clamp_int(score, 0, 100), reasons


def evaluate_commitment_lock(req: CommitmentLockRequest) -> CommitmentLockResponse:

    start_time = time.perf_counter()

    request_id = str(uuid.uuid4())

    policy_versions = get_policy_versions()

    timestamp = datetime.utcnow()

    annual_return = (
        req.annual_return_assumption
        if req.annual_return_assumption is not None
        else settings.DEFAULT_ANNUAL_RETURN
    )

    annual_inflation = (
        req.annual_inflation_assumption
        if req.annual_inflation_assumption is not None
        else settings.DEFAULT_ANNUAL_INFLATION
    )

    assumptions = Assumptions(
        annual_return=annual_return,
        annual_inflation=annual_inflation,
        source="user"
        if req.annual_return_assumption is not None
        else "default",
    )

    total_paid = req.monthly_payment * req.term_months

    fv_nominal = future_value_of_annuity(req.monthly_payment, req.term_months, annual_return)

    fv_real = inflation_adjust(fv_nominal, req.term_months, annual_inflation)

    net_income: Optional[float] = req.net_monthly_income

    effective_tax_used: Optional[float] = None

    tax_fallback_used = None

    tax_confidence = None

    if req.context is not None:

        resolved_net, eff = resolve_net_monthly_income(req.context)

        if resolved_net is not None:

            net_income = resolved_net

            effective_tax_used = eff

            tax_confidence = "medium"

    income_share = (req.monthly_payment / net_income) if net_income else None

    free_cashflow_share = (
        req.monthly_payment / req.current_free_cashflow
        if req.current_free_cashflow
        else None
    )

    goal_delay = None

    if req.goal_cost and req.goal_monthly_contribution:

        delay = compute_goal_delay_months(
            req.monthly_payment,
            req.goal_cost,
            req.goal_monthly_contribution,
        )

        if delay is not None:

            goal_delay = 999 if delay >= 10_000 else int(delay)

    score, reasons = lock_score_and_reasons(
        req.monthly_payment,
        req.term_months,
        net_income,
        req.current_free_cashflow,
    )

    processing_ms = int((time.perf_counter() - start_time) * 1000)

    return CommitmentLockResponse(
        request_id=request_id,
        engine_version=ENGINE_VERSION,
        calculation_timestamp=timestamp,
        processing_ms=processing_ms,
        currency=req.currency,
        total_paid=round(total_paid, 2),
        monthly_payment=round(req.monthly_payment, 2),
        term_months=req.term_months,
        annual_return_used=float(annual_return),
        annual_inflation_used=float(annual_inflation),
        future_value_if_invested=round(fv_real, 2),
        income_share=round(income_share, 4) if income_share else None,
        free_cashflow_share=round(free_cashflow_share, 4)
        if free_cashflow_share
        else None,
        effective_tax_rate_used=effective_tax_used,
        tax_fallback_used=tax_fallback_used,
        tax_confidence=tax_confidence,
        policy_versions=PolicyVersions(**policy_versions),
        goal_delay_months=goal_delay,
        lock_score=score,
        lock_score_confidence="medium",
        engine_confidence="medium",
        reasons=reasons,
        assumptions_used=assumptions,
    )