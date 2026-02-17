"""users, participations 테이블 및 meetups.current_count 추가

Revision ID: 003
Revises: 002
Create Date: 2025-01-01 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nickname", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.add_column("meetups", sa.Column("current_count", sa.Integer(), nullable=False, server_default=sa.text("0")))

    op.create_table(
        "participations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("meetup_id", sa.Integer(), nullable=False),
        sa.Column("approx_lat", sa.Float(), nullable=True),
        sa.Column("approx_lng", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["meetup_id"], ["meetups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "meetup_id", name="uq_participation_user_meetup"),
    )
    op.create_index(op.f("ix_participations_id"), "participations", ["id"], unique=False)
    op.create_index(op.f("ix_participations_meetup_id"), "participations", ["meetup_id"], unique=False)
    op.create_index(op.f("ix_participations_user_id"), "participations", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_participations_user_id"), table_name="participations")
    op.drop_index(op.f("ix_participations_meetup_id"), table_name="participations")
    op.drop_index(op.f("ix_participations_id"), table_name="participations")
    op.drop_table("participations")
    op.drop_column("meetups", "current_count")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
