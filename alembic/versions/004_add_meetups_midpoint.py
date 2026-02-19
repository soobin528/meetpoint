"""add midpoint column to meetups (참여자 중앙값 기반 중간지점)

Revision ID: 004
Revises: 003
Create Date: 2025-01-01 00:00:03.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "meetups",
        sa.Column("midpoint", Geometry(geometry_type="POINT", srid=4326), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("meetups", "midpoint")
