# Participation 모델: 모임 참여

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.models.base import Base


class Participation(Base):
    """참여 테이블. user-meetup 1:1 참여. approx_lat/lng는 4주차 대략화용."""

    __tablename__ = "participations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    meetup_id = Column(Integer, ForeignKey("meetups.id", ondelete="CASCADE"), nullable=False, index=True)
    approx_lat = Column(Float, nullable=True)
    approx_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "meetup_id", name="uq_participation_user_meetup"),)
