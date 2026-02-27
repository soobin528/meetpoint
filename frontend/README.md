# MeetPoint Web

React 18 + Vite + TypeScript + TanStack Query + Leaflet + SSE 클라이언트.

## 설정

```bash
cp .env.example .env
# .env 에서 VITE_API_BASE_URL 수정 (필요 시)
npm install
npm run dev
```

백엔드가 `http://localhost:8000` 이면 Vite proxy 없이도 `VITE_API_BASE_URL=http://localhost:8000` 으로 접근 가능.  
CORS 허용이 필요하면 백엔드에서 해당 오리진 허용.

## 구조

- `src/features/map` – 맵 뷰, BBox
- `src/features/meetup` – 모임 API, 상세, 액션
- `src/features/meetup-stream` – SSE 구독 및 **TanStack Query 캐시 패치**
- `src/shared/api` – API 클라이언트, Query Key Factory
- `src/types` – 백엔드 DTO와 동일 타입

아키텍처 상세는 `../docs/FRONTEND_ARCHITECTURE.md` 참고.
