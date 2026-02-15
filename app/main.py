from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models.base import Base
from app.models.meetup import Meetup  # noqa: F401 — 테이블 메타데이터 등록용
from app.routers.meetups import router as meetups_router


def _run_alembic_upgrade() -> None:
    """앱 기동 시 DB 마이그레이션 자동 적용 (meetups 테이블 등)."""
    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parent.parent
    cfg = Config(str(root / "alembic.ini"))
    command.upgrade(cfg, "head")


# 애플리케이션 팩토리 패턴을 사용할 수도 있지만
# 초기 세팅 단계에서는 단순한 전역 인스턴스로 구성
app = FastAPI(
    title="MeetPoint API",
    description="실시간 하이퍼로컬 즉흥 모임 플랫폼 MeetPoint의 백엔드 API",
    version="0.1.0",
)


@app.on_event("startup")
def _startup_migrate() -> None:
    """기동 시 Alembic upgrade head 실행 (동기 블로킹을 스레드로 처리)."""
    try:
        _run_alembic_upgrade()
    except Exception:
        pass  # DB 미기동 등 실패 시에도 앱은 기동 (예: 로컬에서 DB 없이 실행 시)


# ✅ 라우터 등록은 app 생성 후에!
app.include_router(meetups_router)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: 운영 시 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {"status": "ok"}


@app.get("/", tags=["Root"])
async def root() -> dict:
    return {
        "message": "MeetPoint API에 오신 것을 환영합니다.",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
