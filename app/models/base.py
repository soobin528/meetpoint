from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    모든 SQLAlchemy 모델이 상속할 기본 Base 클래스

    예시:

    class User(Base):
        __tablename__ = "users"
        id: Mapped[int] = mapped_column(primary_key=True, index=True)
        ...
    """

    # 공통 메타데이터나 유틸 메서드를 여기에 추가할 수 있음
    pass

