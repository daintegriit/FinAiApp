
import time
import uuid
import logging
from decimal import Decimal
from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.schemas.commitment_lock import CommitmentLockRequest
from app.schemas.financial_analysis import (
    FinancialAnalysisRequest,
    FinancialAnalysisResponse,
    FinancialHealthSnapshot,
)

from app.engines.financial_explanation import evaluate_financial_explanation
from app.services.financial_orchestrator import FinancialOrchestrator

from app.db.session import get_db


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/financial",
    tags=["Financial AI"],
)

orchestrator = FinancialOrchestrator()


def _build_commitment_request(
    req: FinancialAnalysisRequest,
) -> CommitmentLockRequest:
    """
    Convert FinancialAnalysisRequest into CommitmentLockRequest
    so all engines receive a fully populated request.
    """
    return CommitmentLockRequest(
        # Core commitment — use defaults if not provided
        monthly_payment=req.monthly_payment or req.monthly_expenses or Decimal("1"),
        term_months=req.term_months or 12,

        # Context
        currency=req.currency,
        region=req.region,
        timezone=req.timezone,

        # Income
        net_monthly_income=req.monthly_income,
        current_free_cashflow=(
            (req.monthly_income - req.monthly_expenses)
            if req.monthly_income and req.monthly_expenses
            else None
        ),

        # Demographics
        age=req.age,
        employment_type=req.employment_type,

        # Risk profile
        risk_tolerance=req.risk_tolerance,
        investment_experience=req.investment_experience,

        # Financial snapshot
        savings_buffer=req.savings_buffer,
        existing_debt=req.existing_debt,
        emergency_fund_months=req.emergency_fund_months,

        # Behavioral
        lifestyle_priority=req.lifestyle_priority,
        income_stability=req.income_stability,
        financial_goal=req.financial_goal,

        # Lifestyle utility
        family_value=req.family_value,
        personal_satisfaction=req.personal_satisfaction,
        commute_improvement=req.commute_improvement,

        # Goal modeling
        goal_cost=req.goal_cost,
        goal_monthly_contribution=req.goal_monthly_contribution,
        decision_horizon_years=req.decision_horizon_years,

        # Purchase context
        purchase_category=req.purchase_category,

        # Assets/liabilities

        # Client metadata
        request_origin="mobile",
    )


@router.post(
    "/analyze",
    response_model=FinancialAnalysisResponse,
    summary="Run full financial intelligence analysis",
)
async def analyze_financial_state(
    request: FinancialAnalysisRequest,
    db: Session = Depends(get_db),
) -> FinancialAnalysisResponse:

    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        logger.info(
            "Financial analysis started",
            extra={"request_id": request_id},
        )

        # Convert to CommitmentLockRequest for engines
        commitment_request = _build_commitment_request(request)

        # Run orchestrator
        orchestration = await orchestrator.run(commitment_request)

        engines = orchestration.get("engines", {})
        engine_timings = orchestration.get("engine_timings", {})
        run_id = orchestration.get("run_id")

        # Extract global score
        scenario_engine = engines.get("scenarios")
        global_score = None

        if scenario_engine and hasattr(scenario_engine, "scenario_results"):
            if scenario_engine.scenario_results:
                raw_score = scenario_engine.scenario_results[0].global_financial_score
                if raw_score is not None:
                    global_score = Decimal(str(raw_score))

        # Risk level
        risk_level = None
        if global_score is not None:
            if global_score < 20:
                risk_level = "critical"
            elif global_score < 40:
                risk_level = "high"
            elif global_score < 70:
                risk_level = "moderate"
            else:
                risk_level = "low"

        # Financial health snapshot
        policy_engine = engines.get("policy", {})
        policy_metrics = policy_engine.get("metrics", {}) if isinstance(policy_engine, dict) else {}

        financial_health = FinancialHealthSnapshot(
            income=Decimal(str(request.monthly_income or 0)),
            expenses=Decimal(str(request.monthly_expenses or 0)),
            savings_rate=Decimal(str(
                ((request.monthly_income - request.monthly_expenses) / request.monthly_income)
                if request.monthly_income and request.monthly_expenses and request.monthly_income > 0
                else policy_metrics.get("savings_rate", 0)
            )),
            cashflow=Decimal(str(
                (request.monthly_income - request.monthly_expenses)
                if request.monthly_income and request.monthly_expenses
                else policy_metrics.get("disposable_income", 0)
            )),
        )

        # Explanation
        explanation_result = evaluate_financial_explanation(commitment_request)
        explanation = explanation_result.user_summary

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        generated_at = datetime.now(UTC)

        return FinancialAnalysisResponse(
            request_id=request_id,
            currency=request.currency,
            region=request.region,
            global_financial_score=global_score,
            risk_level=risk_level,
            financial_health=financial_health,
            generated_at=generated_at,
            engines=engines,
            engine_timings=engine_timings,
            explanation=explanation,
            processing_ms=elapsed_ms,
        )

    except ValueError as e:
        logger.warning(
            "Financial analysis validation error",
            extra={"request_id": request_id, "error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.exception(
            "Financial analysis engine failure",
            extra={"request_id": request_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Financial analysis failed",
                "request_id": request_id,
                "message": str(e),
            },
        )