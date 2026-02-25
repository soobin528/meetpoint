# 모임 생성/조회 API
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud.meetup_crud import get_meetups_in_bbox
from app.crud.participation_crud import (
    JoinError,
    LeaveError,
    join_meetup,
    leave_meetup,
    recalculate_midpoint,
)
from app.database import get_db
from app.models.meetup import Meetup, MeetupStatus
from app.realtime.sse_pubsub import (
    publish_midpoint_update,
    publish_meetup_status_changed,
    publish_poi_confirmed,
    stream_midpoint_events,
)
from app.schemas.meetup import ConfirmPoiBody, ConfirmedPoiSchema, MeetupCreate, MeetupResponse
from app.schemas.participation import JoinBody, JoinLeaveBody
from app.services.poi_service import get_pois_for_meetup

router = APIRouter(prefix="/meetups", tags=["Meetups"])


def _midpoint_to_dict(meetup: Meetup) -> Optional[Dict[str, float]]:
    """midpoint Geometry → {lat, lng} 또는 None (SSE/Redis 발행용)."""
    if meetup.midpoint is None:
        return None
    shape = to_shape(meetup.midpoint)
    return {"lat": shape.y, "lng": shape.x}


def _confirmed_poi_schema(meetup: Meetup) -> Optional[ConfirmedPoiSchema]:
    """confirmed_poi_* + confirmed_at → ConfirmedPoiSchema 또는 None."""
    if meetup.confirmed_poi_name is None and meetup.confirmed_poi_lat is None:
        return None
    return ConfirmedPoiSchema(
        name=meetup.confirmed_poi_name or "",
        lat=meetup.confirmed_poi_lat or 0.0,
        lng=meetup.confirmed_poi_lng or 0.0,
        address=meetup.confirmed_poi_address or "",
        confirmed_at=meetup.confirmed_at,
    )


def _meetup_to_response(meetup: Meetup, distance_km: float | None = None) -> MeetupResponse:
    """location(Point)에서 lat/lng 추출해 MeetupResponse 생성. distance_km는 nearby 전용."""
    if meetup.location is None:
        # 데이터가 꼬인 경우 방어 (to_shape(None) 500 방지)
        raise HTTPException(status_code=500, detail="Meetup location is missing")

    shape = to_shape(meetup.location)
    status_val = meetup.status if isinstance(meetup.status, str) else (meetup.status or MeetupStatus.RECRUITING.value)
    if hasattr(status_val, "value"):
        status_val = status_val.value
    return MeetupResponse(
        id=meetup.id,
        status=status_val,
        title=meetup.title,
        description=meetup.description,
        capacity=meetup.capacity,
        current_count=meetup.current_count,
        lat=shape.y,
        lng=shape.x,
        midpoint=_midpoint_to_dict(meetup),
        confirmed_poi=_confirmed_poi_schema(meetup),
        distance_km=distance_km,
    )


@router.post("", response_model=MeetupResponse)
def create_meetup(body: MeetupCreate, db: Session = Depends(get_db)) -> MeetupResponse:
    """모임 생성. lat/lng → PostGIS POINT(4326) 저장."""
    pt = Point(body.lng, body.lat)
    location = WKTElement(pt.wkt, srid=4326)
    meetup = Meetup(
        title=body.title,
        description=body.description,
        capacity=body.capacity,
        location=location,
    )
    db.add(meetup)
    db.commit()
    db.refresh(meetup)
    return _meetup_to_response(meetup)


@router.get("/nearby", response_model=List[MeetupResponse])
def get_meetups_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5.0, ge=0.1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[MeetupResponse]:
    """사용자 좌표 기준 반경 내 모임 검색. distance_km 포함, 가까운 순 정렬."""
    pt = Point(lng, lat)
    user_geog = func.ST_GeogFromText(f"SRID=4326;{pt.wkt}")
    radius_m = radius_km * 1000
    loc_geog = func.ST_GeogFromText(func.ST_AsText(Meetup.location))
    distance_m = func.ST_Distance(loc_geog, user_geog)  # geography → 미터

    q = (
        db.query(Meetup, distance_m.label("distance_m"))
        .filter(func.ST_DWithin(loc_geog, user_geog, radius_m))
        .order_by(distance_m)
        .limit(limit)
    )
    rows = q.all()
    return [_meetup_to_response(m, distance_km=round(d / 1000.0, 6)) for m, d in rows]


@router.get("/bbox", response_model=List[MeetupResponse])
def get_meetups_bbox(
    min_lat: float = Query(..., ge=-90, le=90),
    min_lng: float = Query(..., ge=-180, le=180),
    max_lat: float = Query(..., ge=-90, le=90),
    max_lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db),
) -> List[MeetupResponse]:
    """지도 BBox(사각형) 영역 내 모임 조회. min/max 뒤바뀌어 와도 보정. created_at 내림차순."""
    meetups = get_meetups_in_bbox(db, min_lat, min_lng, max_lat, max_lng)
    return [_meetup_to_response(m) for m in meetups]


@router.get("/{meetup_id}", response_model=MeetupResponse)
def get_meetup(meetup_id: int, db: Session = Depends(get_db)) -> MeetupResponse:
    """id로 모임 조회. 없으면 404."""
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if meetup is None:
        raise HTTPException(status_code=404, detail="Meetup not found")
    return _meetup_to_response(meetup)


@router.post("/{meetup_id}/join")
async def post_join(meetup_id: int, body: JoinBody, db: Session = Depends(get_db)):
    """모임 참여. lat/lng는 approx에 저장되어 중간지점 계산에 사용. 예외 시 rollback."""
    try:
        current_count = join_meetup(db, meetup_id, body.user_id, body.lat, body.lng)
        db.commit()  # ✅ 트랜잭션 소유권: 라우터
        # commit 후 midpoint 갱신 → SSE 구독자에게 실시간 푸시
        meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
        if meetup:
            await publish_midpoint_update(meetup_id, _midpoint_to_dict(meetup))
        return {"message": "joined", "current_count": current_count}

    except JoinError as e:
        db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to join meetup")


@router.delete("/{meetup_id}/leave")
async def delete_leave(meetup_id: int, body: JoinLeaveBody, db: Session = Depends(get_db)):
    """모임 참여 취소. 예외 시 rollback."""
    try:
        current_count = leave_meetup(db, meetup_id, body.user_id)
        db.commit()  # ✅ 트랜잭션 소유권: 라우터
        # commit 후 midpoint 갱신 → SSE 구독자에게 실시간 푸시
        meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
        if meetup:
            await publish_midpoint_update(meetup_id, _midpoint_to_dict(meetup))
        return {"message": "left", "current_count": current_count}

    except LeaveError as e:
        db.rollback()
        raise HTTPException(status_code=e.status_code, detail=e.message)

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to leave meetup")


@router.post("/{meetup_id}/midpoint/recalculate")
def post_recalculate_midpoint(meetup_id: int, db: Session = Depends(get_db)):
    """중간지점 수동 재계산. 참여자들의 approx_lat/lng 중앙값으로 계산."""
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if meetup is None:
        raise HTTPException(status_code=404, detail="Meetup not found")

    try:
        result = recalculate_midpoint(db, meetup_id)
        db.commit()

        if result is None:
            return {
                "message": "recalculated",
                "midpoint": None,
                "reason": "No participants with coordinates",
            }

        lat, lng = result
        return {"message": "recalculated", "midpoint": {"lat": lat, "lng": lng}}

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to recalculate midpoint")


@router.post("/{meetup_id}/confirm-poi")
async def post_confirm_poi(
    meetup_id: int,
    body: ConfirmPoiBody,
    db: Session = Depends(get_db),
):
    """호스트가 선택한 POI를 확정 저장 후 status=CONFIRMED, 실시간 이벤트 발행. 이미 확정 시 409."""
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if meetup is None:
        raise HTTPException(status_code=404, detail="모임을 찾을 수 없습니다.")
    current_status = meetup.status if isinstance(meetup.status, str) else getattr(meetup.status, "value", meetup.status)
    if current_status == MeetupStatus.CONFIRMED.value:
        raise HTTPException(status_code=409, detail="Already confirmed")
    try:
        meetup.confirmed_poi_name = body.name
        meetup.confirmed_poi_lat = body.lat
        meetup.confirmed_poi_lng = body.lng
        meetup.confirmed_poi_address = body.address
        meetup.confirmed_at = datetime.now(timezone.utc)
        meetup.status = MeetupStatus.CONFIRMED.value
        db.commit()
        db.refresh(meetup)
        # commit 성공 후 Redis 발행: poi_confirmed + meetup_status_changed (SSE 구독자에게 전달)
        poi_payload = {
            "name": meetup.confirmed_poi_name,
            "lat": meetup.confirmed_poi_lat,
            "lng": meetup.confirmed_poi_lng,
            "address": meetup.confirmed_poi_address or "",
        }
        await publish_poi_confirmed(meetup_id, poi_payload)
        await publish_meetup_status_changed(meetup_id, MeetupStatus.CONFIRMED.value)
        return {
            "message": "POI가 확정되었습니다.",
            "poi": poi_payload,
            "confirmed_at": meetup.confirmed_at.isoformat() if meetup.confirmed_at else None,
            "status": MeetupStatus.CONFIRMED.value,
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="POI 확정 처리에 실패했습니다.")


@router.get("/{meetup_id}/pois")
async def get_meetup_pois(
    meetup_id: int,
    force: bool = Query(False, description="true면 갱신 제한 무시하고 Kakao 재조회"),
    db: Session = Depends(get_db),
):
    """중간지점 기준 주변 POI 추천 (Kakao Local). Redis 캐시·갱신 제한 적용. force=true 시 강제 갱신."""
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if meetup is None:
        raise HTTPException(status_code=404, detail="모임을 찾을 수 없습니다.")
    midpoint_dict = _midpoint_to_dict(meetup)
    if midpoint_dict is None:
        raise HTTPException(
            status_code=400,
            detail="중간지점이 없습니다. 참여자가 1명 이상이고 좌표가 있어야 합니다.",
        )
    try:
        pois = await get_pois_for_meetup(
            meetup_id,
            midpoint_dict["lat"],
            midpoint_dict["lng"],
            force=force,
        )
        return pois
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{meetup_id}/midpoint/stream")
async def get_midpoint_stream(meetup_id: int):
    """SSE: 해당 모임의 midpoint/poi 갱신 이벤트 실시간 스트림 (midpoint_updated, poi_updated)."""
    return StreamingResponse(
        stream_midpoint_events(meetup_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
