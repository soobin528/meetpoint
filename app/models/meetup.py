# Meetup 모델: 즉흥 모임 엔티티

from enum import Enum as PyEnum

from sqlalchemy import Column, Float, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.models.base import Base


class MeetupStatus(str, PyEnum):
    """모임 상태. RECRUITING → CONFIRMED(확정) 후 join/leave 불가."""

    RECRUITING = "RECRUITING"
    CONFIRMED = "CONFIRMED"
    FINISHED = "FINISHED"
    CANCELED = "CANCELED"


# DB에는 String(20)으로 저장 (마이그레이션 단순화). 앱에서는 MeetupStatus로 비교.
STATUS_DEFAULT = MeetupStatus.RECRUITING.value


class Meetup(Base):
    """모임 테이블. 위치는 PostGIS POINT(WGS84)로 저장. 호스트가 확정한 장소(confirmed_poi) 저장."""

    __tablename__ = "meetups"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), nullable=False, default=STATUS_DEFAULT, server_default=STATUS_DEFAULT)
    title = Column(String(100), nullable=False)  # 제목
    description = Column(Text, nullable=True)  # 설명(선택)
    capacity = Column(Integer, nullable=False, default=10)  # 최대 인원
    current_count = Column(Integer, nullable=False, default=0)  # 현재 참여 인원 (동시성은 FOR UPDATE로 보장)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)  # WGS84 좌표
    midpoint = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)  # 참여자들의 중앙값 기반 중간지점 (PostGIS로 공간 쿼리 가능)
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 생성 시각(타임존 포함)
    # POI 확정: 호스트가 선택한 최종 장소 (실시간 poi_confirmed 이벤트로 브로드캐스트)
    confirmed_poi_name = Column(String(200), nullable=True)
    confirmed_poi_lat = Column(Float, nullable=True)
    confirmed_poi_lng = Column(Float, nullable=True)
    confirmed_poi_address = Column(String(300), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
