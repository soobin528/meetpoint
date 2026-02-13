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


class MeetupResponse(BaseModel):
    """모임 응답 (ORM 호환)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    capacity: int
    lat: float
    lng: float
