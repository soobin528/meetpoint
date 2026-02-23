# Docker 컨테이너에서 Alembic 005 마이그레이션이 안 보일 때

## 1. 구조 정리

### docker-compose.yml
- **볼륨( bind mount )**: `./app` → `/app/app` **만** 있음.
- `alembic/`, `alembic.ini` 는 **마운트되지 않음** → 컨테이너 안 내용은 **이미지 빌드 시점**에 복사된 것만 보임.

### Dockerfile
- `WORKDIR /app`
- `COPY app /app/app`
- `COPY alembic.ini /app/`
- `COPY alembic /app/alembic`
- 즉, **빌드할 때** 호스트의 `alembic/` 전체가 이미지의 `/app/alembic` 으로 들어감. **이미지 재빌드 전에는 새로 만든 005 파일이 이미지에 없음.**

### alembic.ini
- `script_location = alembic` → CWD가 `/app` 이면 `/app/alembic` 을 사용.
- 버전 스캔 경로: `/app/alembic/versions/` (script_location 아래의 versions 디렉터리).

---

## 2. 005가 안 보이는 이유

- **이미지에 `alembic/` 이 COPY 로만 들어가고, `alembic/` 은 볼륨 마운트가 아님.**
- 005 파일은 **로컬(호스트)에만** 있고, 이미지는 **예전에 빌드된 상태**(001~004만 포함)라서 컨테이너의 `/app/alembic/versions/` 에는 005가 없음.

---

## 3. 해결 방법 두 가지

### 방법 A) 볼륨 마운트로 `alembic` 반영 (개발 시 권장)

로컬의 `alembic/` 을 그대로 컨테이너에 붙이면, 005를 추가해도 **재빌드 없이** 바로 반영됨.

**docker-compose.yml 의 web 서비스에 볼륨 한 줄 추가:**

```yaml
  web:
    ...
    volumes:
      - ./app:/app/app
      - ./alembic:/app/alembic   # 추가: 로컬 alembic → 컨테이너 /app/alembic
```

**호스트에서 확인 (PowerShell):**
```powershell
# 프로젝트 루트 (meetpoint) 에서
dir alembic\versions\005*
# 005_add_meetups_confirmed_poi.py 가 있어야 함
```

**컨테이너에서 확인:**
```bash
ls -la /app/alembic/versions/ | grep 005
# 005_add_meetups_confirmed_poi.py 보여야 함
```

이후 컨테이너만 다시 띄우면 됨 (이미지 재빌드 불필요):
```powershell
docker compose up -d
```

---

### 방법 B) 이미지 재빌드 (볼륨 추가 없이 유지)

지금처럼 `alembic` 을 COPY 로만 쓰려면, **005를 포함한 상태로 이미지를 다시 빌드**해야 함.

**Dockerfile 수정은 필요 없음.** (이미 `COPY alembic /app/alembic` 있음.)

**PowerShell (호스트, 프로젝트 루트):**
```powershell
cd c:\Users\monbe\cursor_projects\meetpoint

# 005가 로컬에 있는지 확인
dir alembic\versions\005*

# 컨테이너 중지 후 이미지 재빌드
docker compose down
docker compose build --no-cache web

# 다시 기동
docker compose up -d
```

`--no-cache` 는 캐시 때문에 예전 레이어가 쓰일 때만 사용. 보통은 다음만 해도 됨:
```powershell
docker compose down
docker compose up -d --build
```

---

## 4. 공통: 컨테이너 안에서 마이그레이션 적용

**컨테이너 접속 (PowerShell):**
```powershell
docker exec -it meetpoint-web bash
# 또는
docker exec -it meetpoint-web sh
```

**컨테이너 안에서:**
```bash
cd /app
alembic history -v
# 005가 목록에 있어야 함

alembic upgrade head
# 005 적용됨
```

**DB에서 컬럼 확인 (호스트 PowerShell):**
```powershell
docker exec -it meetpoint-db psql -U meetpoint -d meetpoint -c "\d meetups"
```

또는 psql 안에서:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'meetups'
  AND column_name LIKE 'confirmed%';
```

`confirmed_poi_name`, `confirmed_poi_lat`, `confirmed_poi_lng`, `confirmed_poi_address`, `confirmed_at` 이 보이면 성공.

---

## 5. 요약

| 항목 | 내용 |
|------|------|
| 원인 | `alembic/` 이 이미지 COPY 로만 들어가고, 005 추가 후 이미지 미재빌드 → 컨테이너에 005 없음 |
| A) 마운트 | `docker-compose.yml` 에 `./alembic:/app/alembic` 추가 → 재빌드 없이 005 반영 |
| B) 재빌드 | `docker compose down` 후 `docker compose up -d --build` (또는 `build --no-cache web`) |
| 검증 | 컨테이너: `alembic history`, `alembic upgrade head` / DB: `\d meetups` 또는 `information_schema` 로 confirmed_* 컬럼 확인 |
