"""add_location_fields_to_profiles

Revision ID: f5f63c03e073
Revises: cb5685b5aaa9
Create Date: 2026-06-19 01:42:47.756154

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f5f63c03e073"
down_revision: Union[str, Sequence[str], None] = "cb5685b5aaa9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("city", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("state", sa.String(), nullable=True))
    op.add_column("profiles", sa.Column("zip_code", sa.String(10), nullable=True))
    op.add_column("profiles", sa.Column("latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("profiles", sa.Column("longitude", sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "longitude")
    op.drop_column("profiles", "latitude")
    op.drop_column("profiles", "zip_code")
    op.drop_column("profiles", "state")
    op.drop_column("profiles", "city")