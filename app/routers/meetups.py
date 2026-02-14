# 모임 생성/조회 API

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.meetup import Meetup
from app.schemas.meetup import MeetupCreate, MeetupResponse

router = APIRouter(prefix="/meetups", tags=["Meetups"])


def _meetup_to_response(meetup: Meetup) -> MeetupResponse:
    """location(Point)에서 lat/lng 추출해 MeetupResponse 생성."""
    shape = to_shape(meetup.location)
    return MeetupResponse(
        id=meetup.id,
        title=meetup.title,
        description=meetup.description,
        capacity=meetup.capacity,
        lat=shape.y,
        lng=shape.x,
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
    """사용자 좌표 기준 반경 내 모임 검색. 가까운 순 정렬."""
    pt = Point(lng, lat)
    user_geog = func.ST_GeogFromText(f"SRID=4326;{pt.wkt}")
    radius_m = radius_km * 1000
    # location::geography 와 ST_DWithin / ST_Distance 사용
    loc_geog = func.ST_GeogFromText(func.ST_AsText(Meetup.location))
    q = (
        db.query(Meetup)
        .filter(func.ST_DWithin(loc_geog, user_geog, radius_m))
        .order_by(func.ST_Distance(loc_geog, user_geog))
        .limit(limit)
    )
    rows = q.all()
    return [_meetup_to_response(m) for m in rows]


@router.get("/{meetup_id}", response_model=MeetupResponse)
def get_meetup(meetup_id: int, db: Session = Depends(get_db)) -> MeetupResponse:
    """id로 모임 조회. 없으면 404."""
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if meetup is None:
        raise HTTPException(status_code=404, detail="Meetup not found")
    return _meetup_to_response(meetup)
