# 참여/취소 CRUD (비관적 락으로 정원 초과 방지)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.meetup import Meetup
from app.models.participation import Participation
from app.models.user import User


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


def join_meetup(db: Session, meetup_id: int, user_id: int) -> int:
    """
    모임 참여. 비관적 락(FOR UPDATE)으로 동시 요청 시에도 정원 초과 방지.
    반환: 갱신된 current_count.
    """
    if db.query(User).filter(User.id == user_id).first() is None:
        raise JoinError("User not found", 404)
    # 해당 행을 잠금 → 다른 트랜잭션은 이 행 갱신 전까지 대기 (정원 초과 방지)
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).with_for_update().first()
    if meetup is None:
        raise JoinError("Meetup not found", 404)
    if meetup.current_count >= meetup.capacity:
        raise JoinError("Meetup is full (capacity reached)")
    existing = db.query(Participation).filter(
        Participation.meetup_id == meetup_id,
        Participation.user_id == user_id,
    ).first()
    if existing is not None:
        raise JoinError("Already joined this meetup")

    try:
        db.add(Participation(meetup_id=meetup_id, user_id=user_id))
        meetup.current_count += 1
        db.commit()
        db.refresh(meetup)
        return meetup.current_count
    except IntegrityError:
        # 동시에 같은 user가 join하면 SELECT 시점엔 없어도 INSERT 시 UniqueConstraint 위반 → 500 대신 400
        # DB 에러는 CRUD에서 처리하고 JoinError로 변환 → 라우터는 비즈니스 예외만 처리 (책임 분리)
        db.rollback()
        raise JoinError("Already joined", 400)


def leave_meetup(db: Session, meetup_id: int, user_id: int) -> int:
    """
    모임 참여 취소. FOR UPDATE로 meetup 행 잠근 뒤 current_count 감소.
    반환: 갱신된 current_count.
    """
    meetup = db.query(Meetup).filter(Meetup.id == meetup_id).with_for_update().first()
    if meetup is None:
        raise LeaveError("Meetup not found", 404)
    participation = db.query(Participation).filter(
        Participation.meetup_id == meetup_id,
        Participation.user_id == user_id,
    ).first()
    if participation is None:
        raise LeaveError("Not joined", 400)

    # participation 존재 확인 후 삭제 → current_count 감소는 실제 삭제가 일어날 때만 수행
    # max(0, ...) 보정 제거: participation이 없으면 이미 위에서 에러 발생하므로 current_count는 논리적으로 음수가 될 수 없음
    db.delete(participation)
    meetup.current_count -= 1
    db.commit()
    db.refresh(meetup)
    return meetup.current_count
