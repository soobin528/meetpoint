# POI 추천 API (Kakao Local 연동)

## 환경 변수 (.env)

```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key_here
KAKAO_LOCAL_BASE_URL=https://dapi.kakao.com
POI_RADIUS_M=1000
POI_CACHE_TTL_SEC=120
POI_MIN_REFRESH_SEC=3
POI_MIN_MOVE_M=50
```

## curl 예시

### POI 목록 조회 (캐시 사용)

```bash
curl "http://localhost:8000/meetups/7/pois"
```

### POI 강제 갱신 (Kakao 재조회)

```bash
curl "http://localhost:8000/meetups/7/pois?force=true"
```

### SSE 스트림 (midpoint_updated + poi_updated 수신)

```bash
curl -N "http://localhost:8000/meetups/7/midpoint/stream"
```

## SSE 출력 예시

```
event: midpoint_updated
data: {"type":"midpoint_updated","meetup_id":7,"midpoint":{"lat":37.4979,"lng":127.0276},"ts":"2025-02-11T12:00:00.000000+00:00"}

: ping

event: poi_updated
data: {"meetup_id":7,"midpoint":{"lat":37.4979,"lng":127.0276},"pois":[{"name":"스타벅스 강남점","category":"음식점 > 카페","address":"서울 강남구 ...","road_address":"서울 강남구 ...","lat":37.498,"lng":127.028,"distance_m":120,"place_url":"https://...","provider":"kakao"}],"ts":"2025-02-11T12:00:01.000000+00:00"}
```

## POI 확정 (confirm-poi)

### 요청

```bash
curl -X POST "http://localhost:8000/meetups/7/confirm-poi" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "스타벅스 강남역점",
    "lat": 37.4979,
    "lng": 127.0276,
    "address": "서울 강남구 강남대로 396"
  }'
```

### 응답 예시

```json
{
  "message": "POI가 확정되었습니다.",
  "poi": {
    "name": "스타벅스 강남역점",
    "lat": 37.4979,
    "lng": 127.0276,
    "address": "서울 강남구 강남대로 396"
  },
  "confirmed_at": "2025-02-11T12:00:00.000000+00:00"
}
```

### SSE에서 수신 예시 (event: poi_confirmed)

```
event: poi_confirmed
data: {"type":"poi_confirmed","meetup_id":7,"poi":{"name":"스타벅스 강남역점","lat":37.4979,"lng":127.0276,"address":"서울 강남구 강남대로 396"},"ts":"2025-02-11T12:00:00.000000+00:00"}
```

---

## POI 응답 필드

- `name`: 장소명
- `category`: 카테고리
- `address`: 지번 주소
- `road_address`: 도로명 주소
- `lat`, `lng`: 위경도
- `distance_m`: 중간지점부터 거리(m)
- `place_url`: Kakao 장소 URL
- `provider`: `"kakao"`
