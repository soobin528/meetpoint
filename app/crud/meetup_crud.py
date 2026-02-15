# 모임 조회 CRUD (BBox 등)

from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.meetup import Meetup


def get_meetups_in_bbox(
    db: Session,
    min_lat: float,
    min_lng: float,
    max_lat: float,
    max_lng: float,
) -> List[Meetup]:
    """
    사각형 영역(min_lat, min_lng, max_lat, max_lng) 내의 모임 조회.
    min/max가 뒤바뀌어 와도 sorted()로 보정. created_at 내림차순.
    """
    lat_lo, lat_hi = sorted([min_lat, max_lat])
    lng_lo, lng_hi = sorted([min_lng, max_lng])
    # PostGIS: ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid) → lng, lat 순
    envelope = func.ST_MakeEnvelope(lng_lo, lat_lo, lng_hi, lat_hi, 4326)
    q = (
        db.query(Meetup)
        .filter(func.ST_Intersects(Meetup.location, envelope))
        .order_by(Meetup.created_at.desc())
    )
    return q.all()
