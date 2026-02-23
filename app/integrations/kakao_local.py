# Kakao Local API 연동 (키워드로 장소 검색)

import os
from typing import Any, Dict, List

import httpx

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
KAKAO_LOCAL_BASE_URL = os.getenv("KAKAO_LOCAL_BASE_URL", "https://dapi.kakao.com")
POI_RADIUS_M = int(os.getenv("POI_RADIUS_M", "1000"))
KEYWORD_SEARCH_PATH = "/v2/local/search/keyword.json"


def _standardize(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Kakao 문서를 통일 필드(name, category, address, road_address, lat, lng, distance_m, place_url, provider)로 변환."""
    return {
        "name": doc.get("place_name") or "",
        "category": doc.get("category_name") or "",
        "address": doc.get("address_name") or "",
        "road_address": doc.get("road_address_name") or "",
        "lat": float(doc.get("y") or 0),
        "lng": float(doc.get("x") or 0),
        "distance_m": int(doc.get("distance") or 0),
        "place_url": doc.get("place_url") or "",
        "provider": "kakao",
    }


async def search_poi_near(lat: float, lng: float, radius_m: int | None = None) -> List[Dict[str, Any]]:
    """
    중간지점(lat, lng) 기준 반경 내 장소 검색.
    Kakao 키워드 검색 사용 (query=음식점, radius 적용).
    """
    if not KAKAO_REST_API_KEY:
        raise ValueError("KAKAO_REST_API_KEY가 설정되지 않았습니다.")
    radius = radius_m or POI_RADIUS_M
    url = f"{KAKAO_LOCAL_BASE_URL.rstrip('/')}{KEYWORD_SEARCH_PATH}"
    params = {
        "query": "음식점",
        "x": str(lng),
        "y": str(lat),
        "radius": radius,
        "size": 15,
    }
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"Kakao API 오류: HTTP {resp.status_code}")
        data = resp.json()
        if "documents" not in data:
            return []
        return [_standardize(d) for d in data["documents"]]
