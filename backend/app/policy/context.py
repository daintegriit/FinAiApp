from pydantic import BaseModel, Field
from typing import Optional, Literal

EmploymentType = Literal["w2", "1099", "self_employed", "student", "retired", "unemployed"]

class FinancialContext(BaseModel):
    country: str = Field(..., min_length=2, max_length=2, description="ISO-3166 alpha-2, e.g. US, GB, DE")
    region: Optional[str] = Field(None, description="State/Province code (e.g., CA, NY, ON)")
    currency: str = Field("USD", min_length=3, max_length=3)

    employment_type: EmploymentType = "w2"

    # User may provide either net or gross
    net_monthly_income: Optional[float] = Field(None, gt=0)
    gross_annual_income: Optional[float] = Field(None, gt=0)

    household_size: Optional[int] = Field(1, ge=1, le=20)
