# 참여/취소 요청 스키마

from pydantic import BaseModel


class JoinLeaveBody(BaseModel):
    """참여·취소 시 사용자 식별."""
    user_id: int
