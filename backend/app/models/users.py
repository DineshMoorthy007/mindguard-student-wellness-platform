import enum
from datetime import datetime
from typing import List, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import String, Enum, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.mood_logs import MoodLog
    from app.models.assessments import Assessment
    from app.models.alerts import Alert

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    COUNSELOR = "COUNSELOR"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        index=True,
        comment="Unique identifier (v4)."
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="User email address."
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Bcrypt hashed password."
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        comment="User role permissions ('STUDENT', 'COUNSELOR', 'ADMIN')."
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Soft delete toggle."
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Account creation time."
    )

    # Relationships
    # ON DELETE RESTRICT cascades are configured on the child models' foreign keys.
    mood_logs: Mapped[List["MoodLog"]] = relationship(
        back_populates="student"
    )
    assessments: Mapped[List["Assessment"]] = relationship(
        back_populates="student"
    )
    # Double relationships to alerts: student triggers, counselor is assigned
    triggered_alerts: Mapped[List["Alert"]] = relationship(
        back_populates="student",
        foreign_keys="[Alert.student_id]"
    )
    assigned_alerts: Mapped[List["Alert"]] = relationship(
        back_populates="counselor",
        foreign_keys="[Alert.counselor_id]"
    )
