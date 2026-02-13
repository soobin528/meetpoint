from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.meetups import router as meetups_router

# 애플리케이션 팩토리 패턴을 사용할 수도 있지만
# 초기 세팅 단계에서는 단순한 전역 인스턴스로 구성
app = FastAPI(
    title="MeetPoint API",
    description="실시간 하이퍼로컬 즉흥 모임 플랫폼 MeetPoint의 백엔드 API",
    version="0.1.0",
)

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