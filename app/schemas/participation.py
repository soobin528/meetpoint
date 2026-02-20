# 참여/취소 요청 스키마

from pydantic import BaseModel, Field


class JoinBody(BaseModel):
    """참여 시 사용자 + 위치. 좌표는 중간지점/POI 계산용으로 approx에 저장 (다음 단계에서 200m 그리드 익명화 적용)."""
    user_id: int
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class JoinLeaveBody(BaseModel):
    """취소 시 사용자 식별만 필요 (lat/lng 불필요)."""
    user_id: int
