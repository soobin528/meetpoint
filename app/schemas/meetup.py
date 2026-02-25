# 모임 API 요청/응답 스키마

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

MeetupStatusLiteral = Literal["RECRUITING", "CONFIRMED", "FINISHED", "CANCELED"]


class MeetupCreate(BaseModel):
    """모임 생성 요청."""

    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    capacity: int = Field(default=10, ge=1)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ConfirmPoiBody(BaseModel):
    """POI 확정 요청 (호스트가 선택한 장소 저장·실시간 브로드캐스트)."""

    name: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    address: str = Field(..., max_length=300)


class ConfirmedPoiSchema(BaseModel):
    """확정된 POI (호스트가 선택한 최종 장소). (기존 응답용: nearby/bbox 등에서 사용)"""

    name: str
    lat: float
    lng: float
    address: str
    confirmed_at: Optional[datetime] = None


class MeetupResponse(BaseModel):
    """모임 응답 (nearby/bbox 등 간략 응답)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: MeetupStatusLiteral = "RECRUITING"
    title: str
    description: Optional[str] = None
    capacity: int
    current_count: int = 0
    lat: float
    lng: float
    midpoint: Optional[dict] = None  # {"lat": float, "lng": float} or null
    confirmed_poi: Optional[ConfirmedPoiSchema] = None
    # nearby에서만 의미 있음(사용자 위치 기준 거리). 단건 조회는 기준점이 없어 None.
    distance_km: Optional[float] = None


class MidpointOut(BaseModel):
    """단건 조회용 midpoint DTO."""

    lat: float
    lng: float


class ConfirmedPoiOut(BaseModel):
    """단건 조회용 confirmed_poi DTO."""

    name: str
    lat: float
    lng: float
    address: str
    confirmed_at: datetime


class MeetupDetailOut(BaseModel):
    """GET /meetups/{id} 전용 상세 응답 DTO."""

    id: int
    status: MeetupStatusLiteral
    title: str
    description: Optional[str] = None
    capacity: int
    current_count: int
    lat: float
    lng: float
    midpoint: Optional[MidpointOut] = None
    confirmed_poi: Optional[ConfirmedPoiOut] = None
    distance_km: Optional[float] = None

