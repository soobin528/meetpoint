# 참여/취소 CRUD (비관적 락으로 정원 초과 방지)
import statistics
import math
from typing import Optional, Tuple

from geoalchemy2 import WKTElement
from shapely.geometry import Point
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.meetup import Meetup
from app.models.participation import Participation
from app.models.user import User

# 200m 그리드 익명화: 정확한 위치 저장 방지(프라이버시), approx에 저장해 중간지점/POI 계산은 그대로 활용
GRID_METERS = 200
GRID_DEG = 0.0018  # 위도·경도 약 200m (위도 기준 근사)


def _snap_to_grid(lat: float, lng: float) -> Tuple[float, float]:
    """
    좌표를 약 200m 그리드로 스냅. 정밀 추적 방지(프라이버시), approx 필드에 저장해 midpoint/POI는 그대로 사용.

    검증: SELECT approx_lat, approx_lng FROM participations WHERE meetup_id = X;
    → 0.0018의 배수로 저장된 값이 보이면 정상.
    """
    grid_lat = math.floor(lat / GRID_DEG) * GRID_DEG
    grid_lng = math.floor(lng / GRID_DEG) * GRID_DEG
    return (grid_lat, grid_lng)


class JoinError(Exception):
    """참여 불가 (정원 초과 또는 이미 참여 중)."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


class LeaveError(Exception):
    """취소 불가 (참여 기록 없음 등)."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


def recalculate_midpoint(db: Session, meetup_id: int) -> Optional[Tuple[float, float]]:
    """
    참여자들의 approx_lat/lng 중앙값으로 중간지점 계산.

    - median 사용 이유: mean 대비 outlier에 강건 → 더 공평한 중간 위치.
    - NULL 안전: approx_lat/lng 둘 다 NOT NULL 인 행만 사용.
    - 트랜잭션 소유권: 이 함수는 commit/rollback을 호출하지 않음 (호출자가 처리).
    반환: (lat, lng) 또는 None
    """
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).first()
    if not meetup:
        return None

    coords = (
        db.query(Participation.approx_lat, Participation.approx_lng)
        .filter(
            Participation.meetup_id == meetup_id,
            Participation.approx_lat.isnot(None),
            Participation.approx_lng.isnot(None),
        )
        .all()
    )

    if not coords:
        meetup.midpoint = None
        return None

    lats = [lat for lat, _ in coords]
    lngs = [lng for _, lng in coords]
    median_lat = statistics.median(lats)
    median_lng = statistics.median(lngs)

    # ✅ PostGIS POINT 저장 (주의: Point(lng, lat) 순서)
    pt = Point(median_lng, median_lat)
    meetup.midpoint = WKTElement(pt.wkt, srid=4326)

    return (median_lat, median_lng)


def join_meetup(db: Session, meetup_id: int, user_id: int, lat: float, lng: float) -> int:
    """
    모임 참여.

    - FOR UPDATE로 meetup 행 잠금 → 동시 join 시에도 정원 초과 방지.
    - 참여 시 좌표를 200m 그리드로 스냅 후 approx_lat/approx_lng에 저장 (프라이버시 보호, 중간지점/POI는 approx 기준 유지).

    반환: 갱신된 current_count

    ⚠️ 이 함수는 commit/rollback 하지 않음. 호출자(라우터)가 트랜잭션을 제어.
    """
    if db.query(User).filter(User.id == user_id).first() is None:
        raise JoinError("User not found", 404)

    meetup = (
        db.query(Meetup)
        .filter(Meetup.id == meetup_id)
        .with_for_update()
        .first()
    )
    if meetup is None:
        raise JoinError("Meetup not found", 404)

    if meetup.current_count >= meetup.capacity:
        raise JoinError("Meetup is full (capacity reached)", 400)

    existing = (
        db.query(Participation)
        .filter(
            Participation.meetup_id == meetup_id,
            Participation.user_id == user_id,
        )
        .first()
    )
    if existing is not None:
        raise JoinError("Already joined this meetup", 400)

    # 200m 그리드로 스냅 후 저장 → 정확한 위치 노출 방지, midpoint/POI는 approx 기준으로 동작
    grid_lat, grid_lng = _snap_to_grid(lat, lng)

    try:
        db.add(
            Participation(
                meetup_id=meetup_id,
                user_id=user_id,
                approx_lat=grid_lat,
                approx_lng=grid_lng,
            )
        )
        meetup.current_count += 1

        # ✅ 같은 트랜잭션 안에서 midpoint 재계산 (commit은 호출자가)
        recalculate_midpoint(db, meetup_id)

        return meetup.current_count

    except IntegrityError:
        # 동시에 같은 user가 join하면 UniqueConstraint 위반 가능
        # rollback은 호출자(라우터)에서 수행
        raise JoinError("Already joined", 400)


def leave_meetup(db: Session, meetup_id: int, user_id: int) -> int:
    """
    모임 참여 취소.

    - FOR UPDATE로 meetup 행 잠금
    - participation 삭제 후 current_count 감소
    - 취소 후 midpoint 재계산

    반환: 갱신된 current_count

    ⚠️ 이 함수는 commit/rollback 하지 않음. 호출자(라우터)가 트랜잭션을 제어.
    """
    meetup = (
        db.query(Meetup)
        .filter(Meetup.id == meetup_id)
        .with_for_update()
        .first()
    )
    if meetup is None:
        raise LeaveError("Meetup not found", 404)

    participation = (
        db.query(Participation)
        .filter(
            Participation.meetup_id == meetup_id,
            Participation.user_id == user_id,
        )
        .first()
    )
    if participation is None:
        raise LeaveError("Not joined", 400)

    db.delete(participation)
    meetup.current_count -= 1

    recalculate_midpoint(db, meetup_id)

    return meetup.current_count
