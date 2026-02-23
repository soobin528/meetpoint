"""meetups에 POI 확정 필드 추가 (confirmed_poi_*, confirmed_at)

Revision ID: 005
Revises: 004
Create Date: 2025-02-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("meetups", sa.Column("confirmed_poi_name", sa.String(length=200), nullable=True))
    op.add_column("meetups", sa.Column("confirmed_poi_lat", sa.Float(), nullable=True))
    op.add_column("meetups", sa.Column("confirmed_poi_lng", sa.Float(), nullable=True))
    op.add_column("meetups", sa.Column("confirmed_poi_address", sa.String(length=300), nullable=True))
    op.add_column("meetups", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("meetups", "confirmed_at")
    op.drop_column("meetups", "confirmed_poi_address")
    op.drop_column("meetups", "confirmed_poi_lng")
    op.drop_column("meetups", "confirmed_poi_lat")
    op.drop_column("meetups", "confirmed_poi_name")
