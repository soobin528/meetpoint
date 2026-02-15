"""add GiST index on meetups.location (공간 조회 성능)

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_meetups_location_gist "
        "ON meetups USING GIST (location);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_meetups_location_gist;")
