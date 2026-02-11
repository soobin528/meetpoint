import os
from typing import Generator

from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# DATABASE_URL 예시:
# postgresql+psycopg2://meetpoint:meetpoint@db:5432/meetpoint
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://meetpoint:meetpoint@localhost:5432/meetpoint")

# SQLAlchemy 엔진 생성
# - future=True: 최신 SQLAlchemy 스타일 사용
engine: Engine = create_engine(DATABASE_URL, echo=False, future=True)


@event.listens_for(Engine, "connect")
def ensure_postgis(dbapi_connection, connection_record) -> None:
    """
    데이터베이스 연결 시 PostGIS 확장을 자동으로 활성화하는 리스너

    - CREATE EXTENSION IF NOT EXISTS postgis;
    - 이 동작에는 SUPERUSER 권한이 필요할 수 있음
      (개발용 DB에서는 보통 postgres 기본 유저로 처리)
    """
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.close()
    except Exception:
        # 권한 문제 등으로 실패해도 애플리케이션 전체 동작은 막지 않음
        # 필요 시 로깅 시스템 연동
        pass


# 세션 팩토리 생성
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 의존성 주입(Dependency Injection)에서 사용할 DB 세션 제공 함수

    Usage 예시:

    @router.get("/items")
    def list_items(db: Session = Depends(get_db)):
        ...
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

