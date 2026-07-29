"""add_financial_profile_fields

Revision ID: cb5685b5aaa9
Revises: 0fd211cd256a
Create Date: 2026-06-18 11:55:17.910785

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "cb5685b5aaa9"
down_revision: Union[str, Sequence[str], None] = "0fd211cd256a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to profiles table
    op.add_column("profiles", sa.Column("financial_goal", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("lifestyle", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("income_stability", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("savings_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("profiles", sa.Column("debt_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("profiles", sa.Column("emergency_fund_months", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "emergency_fund_months")
    op.drop_column("profiles", "debt_amount")
    op.drop_column("profiles", "savings_amount")
    op.drop_column("profiles", "income_stability")
    op.drop_column("profiles", "lifestyle")
    op.drop_column("profiles", "financial_goal")