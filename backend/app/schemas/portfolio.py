from pydantic import BaseModel, Field


class PortfolioRequest(BaseModel):

    monthly_contribution: float = Field(
        gt=0,
        description="Monthly investment contribution"
    )

    years: int = Field(
        gt=0,
        le=60,
        description="Investment horizon in years"
    )

    annual_return: float = Field(
        default=0.07,
        ge=-0.5,
        le=0.5,
        description="Expected annual return"
    )

    volatility: float = Field(
        default=0.15,
        ge=0,
        le=1,
        description="Annual market volatility"
    )

    simulations: int = Field(
        default=500,
        ge=10,
        le=10000,
        description="Number of Monte Carlo simulations"
    )