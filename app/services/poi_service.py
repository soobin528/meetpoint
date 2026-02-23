# POI 추천 서비스: Redis 캐시, 갱신 제한, Kakao 연동, SSE 발행

import json
import math
import os
import time
from typing import Any, Dict, List, Optional

from app.integrations.kakao_local import search_poi_near
from app.realtime.sse_pubsub import publish_poi_update, redis_client

POI_CACHE_TTL_SEC = int(os.getenv("POI_CACHE_TTL_SEC", "120"))
POI_MIN_REFRESH_SEC = float(os.getenv("POI_MIN_REFRESH_SEC", "3"))
POI_MIN_MOVE_M = float(os.getenv("POI_MIN_MOVE_M", "50"))
POI_RADIUS_M = int(os.getenv("POI_RADIUS_M", "1000"))

CACHE_KEY_PREFIX = "poi:"
LAST_MIDPOINT_KEY = "last_midpoint:"
LAST_POI_TS_KEY = "last_poi_refresh_ts:"


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """두 위경도 사이 거리(미터) 근사."""
    R = 6371000  # 지구 반경 m
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _cache_key(meetup_id: int, lat: float, lng: float) -> str:
    """캐시 키: meetup_id + 반올림된 좌표 + 반경 + 모드."""
    return f"{CACHE_KEY_PREFIX}{meetup_id}:{round(lat, 4)}:{round(lng, 4)}:{POI_RADIUS_M}:default"


async def get_pois_for_meetup(
    meetup_id: int,
    mid_lat: float,
    mid_lng: float,
    force: bool = False,
) -> List[Dict[str, Any]]:
    """
    모임 중간지점 기준 POI 목록 반환.
    Redis 캐시 + TTL, 최소 이동 거리/최소 갱신 간격으로 Kakao 호출 제한.
    Kakao 실패 시 캐시 있으면 캐시 반환, 없으면 502용 예외.
    """
    now_ts = time.time()
    ck = _cache_key(meetup_id, mid_lat, mid_lng)

    # 캐시 hit (force가 아니면 먼저 확인)
    if not force:
        cached = await redis_client.get(ck)
        if cached is not None:
            try:
                return json.loads(cached)
            except Exception:
                pass

    # 갱신 제한: 마지막 midpoint, 마지막 갱신 시각
    last_mp = await redis_client.get(f"{LAST_MIDPOINT_KEY}{meetup_id}")
    last_ts_str = await redis_client.get(f"{LAST_POI_TS_KEY}{meetup_id}")
    last_ts = float(last_ts_str) if last_ts_str else 0.0
    elapsed = now_ts - last_ts

    moved_m = POI_MIN_MOVE_M + 1.0
    if last_mp:
        try:
            parts = last_mp.split(",")
            if len(parts) == 2:
                last_lat, last_lng = float(parts[0]), float(parts[1])
                moved_m = _haversine_m(last_lat, last_lng, mid_lat, mid_lng)
        except Exception:
            pass

    # force가 아니면: 최소 이동 + 최소 경과 시간 만족할 때만 Kakao 호출
    if not force and (moved_m < POI_MIN_MOVE_M or elapsed < POI_MIN_REFRESH_SEC):
        cached = await redis_client.get(ck)
        if cached is not None:
            try:
                return json.loads(cached)
            except Exception:
                pass
        # 캐시도 없고 갱신도 안 해도 되면 빈 배열 반환 (또는 이전 캐시 키 스캔은 생략하고 빈 배열)
        return []

    # Kakao 호출
    try:
        pois = await search_poi_near(mid_lat, mid_lng, POI_RADIUS_M)
    except Exception:
        # Kakao 실패 시 캐시 있으면 반환
        cached = await redis_client.get(ck)
        if cached is not None:
            try:
                return json.loads(cached)
            except Exception:
                pass
        raise RuntimeError("POI 조회에 실패했습니다. (Kakao API 오류 또는 키 미설정)")

    # 캐시 저장 + TTL
    await redis_client.setex(ck, POI_CACHE_TTL_SEC, json.dumps(pois, ensure_ascii=False))
    await redis_client.set(f"{LAST_MIDPOINT_KEY}{meetup_id}", f"{mid_lat},{mid_lng}")
    await redis_client.set(f"{LAST_POI_TS_KEY}{meetup_id}", str(now_ts))

    # SSE로 poi_updated 발행
    midpoint = {"lat": mid_lat, "lng": mid_lng}
    await publish_poi_update(meetup_id, midpoint, pois)

    return pois
