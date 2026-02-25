"""add meetups.status (RECRUITING, CONFIRMED, FINISHED, CANCELED)

Revision ID: 006
Revises: 005
Create Date: 2025-02-11 00:00:00.000001

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "meetups",
        sa.Column("status", sa.String(length=20), server_default="RECRUITING", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("meetups", "status")
