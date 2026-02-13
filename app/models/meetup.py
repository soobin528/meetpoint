# Meetup 모델: 즉흥 모임 엔티티

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.models.base import Base


class Meetup(Base):
    """모임 테이블. 위치는 PostGIS POINT(WGS84)로 저장."""

    __tablename__ = "meetups"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)  # 제목
    description = Column(Text, nullable=True)  # 설명(선택)
    capacity = Column(Integer, nullable=False, default=10)  # 최대 인원
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)  # WGS84 좌표
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 생성 시각(타임존 포함)
