# 모임 API 요청/응답 스키마

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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


class MeetupResponse(BaseModel):
    """모임 응답 (ORM 호환)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    capacity: int
    lat: float
    lng: float
    # nearby에서만 의미 있음(사용자 위치 기준 거리). 단건 조회는 기준점이 없어 None.
    distance_km: Optional[float] = None
