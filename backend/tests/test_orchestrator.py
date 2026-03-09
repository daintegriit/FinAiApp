import pytest
import asyncio

from app.services.financial_orchestrator import FinancialOrchestrator


# --------------------------------------------------
# Test Input Fixture
# --------------------------------------------------

@pytest.fixture
def sample_financial_input():

    return {
        "income": 5000,
        "expenses": 3200,
        "savings_rate": 0.18,

        "monthly_contribution": 500,
        "investment_years": 25,
        "expected_return": 0.07,
        "volatility": 0.15,
        "simulations": 100,

        "scenarios": []
    }


# --------------------------------------------------
# Basic Execution Test
# --------------------------------------------------

@pytest.mark.asyncio
async def test_orchestrator_runs(sample_financial_input):

    orchestrator = FinancialOrchestrator()

    result = await orchestrator.run(sample_financial_input)

    assert isinstance(result, dict)

    assert "engines" in result
    assert "engine_timings" in result
    assert "total_runtime_ms" in result


# --------------------------------------------------
# Engine Output Structure Test
# --------------------------------------------------

@pytest.mark.asyncio
async def test_orchestrator_returns_expected_engines(sample_financial_input):

    orchestrator = FinancialOrchestrator()

    result = await orchestrator.run(sample_financial_input)

    engines = result["engines"]

    assert "policy" in engines
    assert "portfolio" in engines
    assert "commitment" in engines
    assert "scenarios" in engines


# --------------------------------------------------
# Runtime Metrics Test
# --------------------------------------------------

@pytest.mark.asyncio
async def test_engine_timings_exist(sample_financial_input):

    orchestrator = FinancialOrchestrator()

    result = await orchestrator.run(sample_financial_input)

    timings = result["engine_timings"]

    assert isinstance(timings, dict)

    for engine, runtime in timings.items():

        assert runtime >= 0


# --------------------------------------------------
# Concurrency Test
# --------------------------------------------------

@pytest.mark.asyncio
async def test_orchestrator_runs_concurrently(sample_financial_input):

    orchestrator = FinancialOrchestrator()

    tasks = [
        orchestrator.run(sample_financial_input)
        for _ in range(5)
    ]

    results = await asyncio.gather(*tasks)

    assert len(results) == 5

    for r in results:
        assert "engines" in r


# --------------------------------------------------
# Error Isolation Test
# --------------------------------------------------

@pytest.mark.asyncio
async def test_orchestrator_handles_engine_failure(monkeypatch, sample_financial_input):

    orchestrator = FinancialOrchestrator()

    async def failing_engine(data):
        raise RuntimeError("Simulated failure")

    orchestrator.engines["portfolio"] = failing_engine

    result = await orchestrator.run(sample_financial_input)

    assert "engines" in result

    # portfolio should fail but others should still run
    assert "policy" in result["engines"]
    assert "commitment" in result["engines"]