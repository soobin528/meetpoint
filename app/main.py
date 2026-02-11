from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 애플리케이션 팩토리 패턴을 사용할 수도 있지만
# 초기 세팅 단계에서는 단순한 전역 인스턴스로 구성
app = FastAPI(
    title="MeetPoint API",
    description="실시간 하이퍼로컬 즉흥 모임 플랫폼 MeetPoint의 백엔드 API",
    version="0.1.0",
)

# CORS 설정
# - 프런트엔드 개발 단계에서는 모든 origin 허용
# - 운영 환경에서는 특정 도메인만 허용하도록 수정해야 함
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: 운영 시 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    헬스 체크 엔드포인트

    - 인프라/모니터링에서 기본 체크 용도로 사용
    - 단순히 서비스가 살아있는지 확인
    """
    return {"status": "ok"}


@app.get("/", tags=["Root"])
async def root() -> dict:
    """
    기본 루트 엔드포인트

    - 간단한 API 설명을 반환
    """
    return {
        "message": "MeetPoint API에 오신 것을 환영합니다.",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
    }


if __name__ == "__main__":
    # 로컬에서 python app/main.py 로 실행하고 싶을 때 사용
    # (실제 개발에서는 uvicorn CLI를 사용하는 것을 권장)
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

