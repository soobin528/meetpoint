# MeetPoint 🗺️

실시간 **하이퍼로컬 즉흥 모임 플랫폼** MeetPoint의 백엔드 API 프로젝트입니다.  
FastAPI + PostgreSQL(PostGIS) + Redis를 Docker 기반으로 구성합니다.

---

## 개요

- **백엔드 프레임워크**: FastAPI  
- **데이터베이스**: PostgreSQL 15 + PostGIS  
- **캐시/큐**: Redis  
- **런타임**: Python 3.11+ (권장)  
- **인프라**: Docker / docker-compose

---

## 폴더 구조

```text
meetpoint/
  app/
    main.py          # FastAPI 엔트리포인트 (헬스체크, CORS 설정 포함)
    database.py      # PostgreSQL + PostGIS 연결 및 세션 관리
    models/
      base.py        # SQLAlchemy Base 클래스
  .env.example       # 환경 변수 템플릿
  docker-compose.yml # DB, Redis, FastAPI 컨테이너 구성
  requirements.txt   # Python 의존성 목록
  .gitignore         # Git 무시 규칙
  README.md          # 프로젝트 설명 문서
```

---

## 사전 준비

- Docker 및 docker-compose 설치
- Python 3.11 이상 (로컬 실행/개발 시)

---

## 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env` 파일 생성

```bash
cp .env.example .env
```

2. 필요에 맞게 값 수정

- DB 이름, 유저, 비밀번호
- Redis URL
- `APP_ENV` 등

---

## 의존성 설치 (선택, 로컬 실행 시)

Docker 안에서만 실행한다면 이 단계는 생략 가능하지만,  
로컬에서 테스트나 코드 실행을 원한다면 가상환경을 만들고 설치하는 것을 권장합니다.

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Docker로 개발 환경 실행

```bash
docker-compose up --build
```

- FastAPI: `http://localhost:8000`
- 자동 생성 문서:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`
- 헬스 체크: `http://localhost:8000/health`

컨테이너를 백그라운드에서 실행하고 싶다면:

```bash
docker-compose up -d --build
```

중지:

```bash
docker-compose down
```

---

## 트러블슈팅: ModuleNotFoundError: No module named 'app'

 Docker + FastAPI 트러블슈팅 사례입니다.

### 증상

- `docker-compose up --build` 실행 후, `web`(FastAPI) 컨테이너 로그에 아래와 비슷한 메시지 출력
  - `meetpoint-web    | ModuleNotFoundError: No module named 'app'`
- FastAPI 서버가 기동되지 않고 컨테이너가 재시작되거나 종료됨

### 원인 분석

- **컨테이너 내부 디렉터리 구조와 `uvicorn` 모듈 경로가 불일치**
  - `Dockerfile` 에서는 다음과 같이 복사:
    - `COPY app /app/app` → 컨테이너 내부 구조: `/app/app/main.py`
  - `uvicorn` 실행 커맨드:
    - `uvicorn app.main:app` → `/app/app/main.py` 를 기준으로 `app` 패키지를 찾음
  - 하지만 초기 `docker-compose.yml` 설정에서:
    - `volumes: - ./app:/app` 으로 마운트
    - 결과적으로 컨테이너 내부에 `/app/main.py` 가 생기며, 빌드 시 복사한 `/app/app` 구조를 덮어씌움
  - 따라서, `uvicorn` 이 기대하는 `/app/app/main.py` 가 사라져서 `ModuleNotFoundError: No module named 'app'` 발생

### 해결 방법

- `docker-compose.yml`의 `web` 서비스 볼륨 마운트를 아래와 같이 수정:

```yaml
services:
  web:
    # ...
    volumes:
      # 로컬 ./app → 컨테이너 /app/app 으로 마운트하여
      # uvicorn app.main:app 이 바라보는 모듈 경로(/app/app/main.py)를 유지
      - ./app:/app/app
```

- 이후 아래 순서로 재실행:

```bash
docker-compose down
docker-compose up --build
```

### 결과 및 인사이트

- FastAPI 컨테이너가 정상 기동되고, 로그에
  - `Uvicorn running on http://0.0.0.0:8000`
  - `Application startup complete.`
  가 출력됨
- 브라우저에서 `http://localhost:8000`, `/health`, `/docs` 에 정상 접속 가능
- **배운 점**:
  - Docker 빌드 시의 `COPY` 경로와 런타임의 `volumes` 마운트가 서로 충돌할 수 있으며,
  - `uvicorn app.main:app` 이 의미하는 모듈 경로(`/app/app/main.py`)와 실제 컨테이너 디렉터리 구조를 일치시키는 것이 중요함
  - “이미지 빌드 시점의 레이아웃”과 “개발 편의를 위한 볼륨 마운트”가 어떻게 상호작용하는지 이해하고 조정한 경험으로 정리 가능

---

## 주요 파일 설명

- `app/main.py`
  - FastAPI 애플리케이션 인스턴스 생성
  - CORS 설정 (현재는 개발 편의를 위해 `*` 허용)
  - `/health` 헬스 체크 엔드포인트

- `app/database.py`
  - SQLAlchemy `Engine` 및 `SessionLocal` 생성
  - DB 연결 시 `CREATE EXTENSION IF NOT EXISTS postgis;` 실행 시도
  - FastAPI 의존성용 `get_db()` 제공

- `app/models/base.py`
  - 모든 모델이 상속할 `Base` 클래스 정의

- `.env.example`
  - DB, Redis, 앱 환경 관련 환경 변수 템플릿

---

## 다음 단계 (확장 아이디어)

- `app/models/`에 도메인 엔티티 모델 추가 (예: User, Meetup, Location 등)
- 라우터 모듈 분리 (`app/api/v1/routers.py` 등)
- 인증/인가(JWT, OAuth2 등) 추가
- PostGIS 기반 위치 검색/반경 검색 API 설계

---

## 라이선스

내부 프로젝트라면 조직 규칙에 맞게,  
오픈소스라면 MIT, Apache-2.0 등 적절한 라이선스를 명시하세요.

