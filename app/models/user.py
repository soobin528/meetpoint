# User 모델

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.models.base import Base


class User(Base):
    """사용자 테이블."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
