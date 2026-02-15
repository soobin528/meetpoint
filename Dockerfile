# MeetPoint FastAPI 애플리케이션용 Dockerfile
# - Python 3.11 slim 이미지를 기반으로 사용
# - 의존성 설치 후 앱 코드 추가

FROM python:3.11-slim

# 운영 환경에서 필요한 기본 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉터리 설정
WORKDIR /app

# Python 관련 기본 설정
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 의존성 파일 복사 및 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# 애플리케이션 코드 복사
COPY app /app/app
# Alembic (기동 시 마이그레이션으로 meetups 테이블 생성)
COPY alembic.ini /app/
COPY alembic /app/alembic

# 컨테이너 기본 실행 명령
# - docker-compose.yml 에서 override 하여 --reload 등을 설정함
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--app-dir", "app", "--host", "0.0.0.0", "--port", "8000", "--reload"]



