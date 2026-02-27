# MeetPoint 프론트엔드 아키텍처

## 개요

맵 퍼스트 하이퍼로컬 모임 플랫폼 MeetPoint의 프론트엔드는 **React 18 + Vite + TypeScript + TanStack Query + Leaflet + SSE** 로 구성하며, 백엔드의 PostGIS·FSM·실시간 이벤트와 **엄격한 API 계약**을 유지합니다.

---

## 1. 폴더 구조 (Feature-based)

```
frontend/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   │
│   ├── app/                    # 앱 진입점
│   │   └── providers.tsx       # QueryClientProvider (retry, staleTime, refetchOnWindowFocus)
│   │
│   ├── pages/
│   │   ├── MapPage.tsx         # 메인: 맵 + 바텀시트, bbox/zoom/selectedId
│   │   └── index.ts
│   │
│   ├── features/
│   │   ├── map/
│   │   │   ├── MapView.tsx, MapBBoxReporter.tsx, MapZoomReporter.tsx
│   │   │   ├── MapMarkers.tsx  # 클러스터 + 단일 마커, 클러스터 클릭 확대
│   │   │   ├── useClusters.ts  # supercluster
│   │   │   ├── types.ts        # BBox
│   │   │   └── index.ts
│   │   ├── meetup/
│   │   │   ├── api.ts          # bbox, detail, join, leave, confirmPoi, finish, cancel
│   │   │   └── ...
│   │   ├── meetup-detail/
│   │   │   ├── MeetupBottomSheet.tsx, MeetupDetail.tsx, StatusBadge.tsx
│   │   │   └── index.ts
│   │   ├── meetup-stream/
│   │   │   ├── hooks/useMeetupStream.ts  # 재연결 지수 백오프, parseJsonSafe
│   │   │   ├── events.ts
│   │   │   └── index.ts
│   │       ├── components/     # PoiList, PoiRecommendation
│   │       └── hooks/
│   │
│   ├── shared/                 # 공용
│   │   ├── api/
│   │   │   ├── client.ts        # fetch 래퍼, baseURL
│   │   │   └── keys.ts          # Query Key Factory
│   │   ├── components/         # Button, Sheet, Spinner
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── types/                  # 백엔드 DTO와 1:1 매핑
│   │   ├── meetup.ts
│   │   ├── sse.ts
│   │   └── index.ts
│   │
│   └── config/
│       └── env.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

- **features**: 화면/기능 단위로 묶고, 각 feature가 `components`, `hooks`, `api` 를 가질 수 있음.
- **shared**: 여러 feature에서 쓰는 API 클라이언트, Query 키, 공용 UI.
- **types**: 백엔드 스키마(MeetupResponse, MeetupDetailOut 등)와 동일한 타입 정의 → API 계약 보장.

---

## 2. 상태 관리 전략

| 구분 | 도구 | 용도 |
|------|------|------|
| **서버 상태** | TanStack Query | meetups 목록(bbox), meetup 상세, POI 목록 등 모든 GET 데이터. **SSE 이벤트는 반드시 Query 캐시를 패치**하여 단일 소스 유지. |
| **클라이언트 상태** | React useState / useReducer | 맵 bbox, 바텀시트 열림/닫힘, 선택된 meetup id, 모달 등. 서버 데이터와 혼동하지 않도록 최소화. |
| **URL 상태** | React Router (선택) | 선택된 meetup id를 `/meetup/:id` 로 두면 공유·새로고침 대응에 유리. |

원칙:

- **서버가 진실의 원천**: 목록/상세는 모두 `useQuery` 로 가져오고, SSE로 수신한 payload는 `queryClient.setQueryData` 로 해당 쿼리 캐시만 갱신.
- **로컬만 갱신하지 않음**: SSE 이벤트를 받아서 `setState` 만 하면 캐시와 불일치가 생기고, 다른 탭/컴포넌트와 동기화되지 않음. 반드시 **캐시 패치** 후 UI는 캐시 구독으로만 그리기.

### TanStack Query 기본값 (에러·새로고침 전략)

- `staleTime: 60_000`: 1분간 fresh.
- `retry: 1`: 실패 시 1회 재시도.
- `refetchOnWindowFocus: false`: 포커스 시 자동 refetch 비활성화.

REST 실패 시 **ApiError** (status, detail)를 던져, 바텀시트 등에서 **인라인 에러 메시지**(특히 409 충돌)로 표시.

요청이 `AbortController` 로 취소될 때는 **AbortRequestError** 를 던져 사용자 에러와 구분합니다. UI/쿼리 레벨에서는 AbortRequestError 를 무시하여, 빠른 bbox 변경 등으로 인한 취소가 에러로 보이지 않도록 합니다.

---

## 3. Query Key 설계

계층적·일관된 키로 **캐시 무효화·SSE 패치**를 쉽게 합니다.

```ts
// shared/api/keys.ts

export const meetupKeys = {
  all: ['meetups'] as const,
  lists: () => [...meetupKeys.all, 'list'] as const,
  list: (bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }) =>
    [...meetupKeys.lists(), bbox] as const,
  details: () => [...meetupKeys.all, 'detail'] as const,
  detail: (id: number) => [...meetupKeys.details(), id] as const,
};

export const poiKeys = {
  all: ['pois'] as const,
  list: (meetupId: number) => [...poiKeys.all, meetupId] as const,
};
```

- **BBox 기반 refetch**: `list(bbox)` 를 `useQuery` 의 queryKey로 사용. 맵 이동 시 bbox가 바뀌면 새 쿼리로 refetch.
- **SSE 패치**: `meetup_status_changed` / `midpoint_updated` 등은 `meetupKeys.detail(meetup_id)` 로 `setQueryData` 하고, 목록이 필요하면 `invalidateQueries(meetupKeys.lists())` 또는 목록 캐시를 직접 순회해 해당 id만 갱신.

---

## 4. SSE 연동 전략

### 4.1 이벤트 종류와 payload

| event | payload 필드 | 캐시 패치 대상 |
|-------|--------------|----------------|
| `midpoint_updated` | meetup_id, midpoint, ts | meetup detail(meetup_id) → midpoint 갱신 |
| `poi_updated` | meetup_id, midpoint, pois, ts | meetup detail → midpoint; pois list(meetup_id) → pois |
| `poi_confirmed` | meetup_id, poi, ts | meetup detail → confirmed_poi + status=CONFIRMED |
| `meetup_status_changed` | meetup_id, status, ts | meetup detail + 목록 캐시 내 해당 id → status 갱신 |

### 4.2 구독 시점

- **맵 전체가 아닌 “현재 상세로 열린 meetup” 또는 “뷰포트 내 meetup id 목록”**만 스트림 구독하는 전략이 확장성에 유리.
- 1차: **선택된 meetup 1개**에 대해 `GET /meetups/{id}/midpoint/stream` 구독. 바텀시트를 연 meetup이 바뀔 때마다 이전 EventSource 닫고 새 id로 구독.

### 4.3 캐시 패치 규칙

1. **detail 캐시**: `queryClient.getQueryData(meetupKeys.detail(id))` 가 있으면, 이벤트 payload로 `midpoint` / `confirmed_poi` / `status` 만 병합 후 `setQueryData(meetupKeys.detail(id), merged)`.
2. **list 캐시**: bbox 쿼리가 여러 개일 수 있으므로, `queryClient.getQueriesData({ queryKey: meetupKeys.lists() })` 로 모든 목록 쿼리를 순회해 해당 id 항목만 status/midpoint/confirmed_poi 갱신 후 `setQueryData` 로 덮어쓰기.
3. **poi 쿼리**: `poi_updated` 시 `poiKeys.list(meetup_id)` 를 payload.pois 로 `setQueryData`.

이렇게 하면 **SSE가 서버 상태의 단일 소스(TanStack Query 캐시)를 갱신**하고, UI는 전부 쿼리 구독으로만 반응합니다.

### 4.4 SSE 재연결 및 에러 처리

- **재연결**: `onerror` 또는 연결 종료 시 **지수 백오프**로 재연결. 최초 1초, 이후 2초·4초·… 최대 30초로 제한.
- **클린업**: unmount 시 `EventSource#close()` 호출 및 예약된 `setTimeout` 재연결 취소.
- **JSON 파싱**: 수신 `data`는 `parseJsonSafe`로 파싱; 실패 시 해당 이벤트만 무시하고 캐시는 건드리지 않음.
- **connectionId 가드**: `useMeetupStream` 은 `connectionIdRef` 를 증가시키고, 각 연결/재연결 시 현재 id 와 비교해, **meetupId 가 바뀐 뒤에도 옛 스트림이 다시 열리지 않도록** 방어합니다. `VITE_DEBUG_SSE=true` 시 open/close/reconnect 로그를 콘솔에 출력해 디버깅에 도움을 줍니다.

---

## 5. 컴포넌트 구성

| 영역 | 컴포넌트 | 역할 |
|------|-----------|------|
| **맵** | `MapView` | Leaflet 맵 컨테이너, bbox 변경 시 콜백. |
| | `MapMarkers` | meetups 목록을 마커로 표시, 클릭 시 선택 id 설정. |
| | `MapControls` | 줌, 내 위치 등. |
| **바텀시트** | `MeetupBottomSheet` | 열림/닫힘, 높이 제어. 내부에 `MeetupDetail` 또는 `MeetupDetailSkeleton`. |
| **모임** | `MeetupDetail` | 단건 상세 표시. status에 따라 참여/확정/종료/취소 버튼 노출(FSM 규칙). |
| | `MeetupCard` | 목록/마커 팝업용 짧은 카드. |
| **POI** | `PoiList` | 추천 POI 목록. 확정 시 `confirmed_poi` 표시. |
| **스트림** | (훅) `useMeetupStream(meetupId)` | EventSource 연결, 수신 시 queryClient로 캐시 패치. |

FSM 규칙 반영:

- `status === 'RECRUITING'`: 참여/참여취소, POI 확정(confirm-poi), **취소(cancel)** 노출.
- `status === 'CONFIRMED'`: 참여/취소 비활성화(또는 409 메시지 표시), **종료(finish)** 노출.
- `status === 'FINISHED' | 'CANCELED'`: 액션 버튼 숨기거나 “종료됨”/“취소됨” 배지만 표시.

---

## 6. 초기 프로젝트 셋업 절차

1. **프론트엔드 디렉터리 및 의존성**
   ```bash
   cd frontend
   npm install
   ```

2. **환경 변수**
   - `frontend/.env` 에 `VITE_API_BASE_URL=http://localhost:8000` 설정 (또는 백엔드 주소).
   - SSE 스트림 URL도 동일 base 사용.

3. **실행**
   ```bash
   npm run dev
   ```
   - 맵 퍼스트 레이아웃, BBox 기반 meetups 목록, 마커 클릭 시 바텀시트 + 해당 id SSE 구독까지 동작하는 상태로 구성됨.

4. **빌드**
   ```bash
   npm run build
   ```

폴더 구조·타입·Query 키·SSE 캐시 패치는 이미 `frontend/src` 에 반영되어 있음. **클러스터링**(supercluster, useClusters, MapMarkers), **FSM UI**(MeetupDetail + StatusBadge, 호스트/상태별 버튼), **에러 처리**(ApiError 인라인, Query retry/staleTime), **SSE 재연결**(지수 백오프, parseJsonSafe) 포함.
