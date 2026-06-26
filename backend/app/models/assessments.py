import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4
from sqlalchemy import Float, Enum, DateTime, ForeignKey, CheckConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.users import User
    from app.models.alerts import Alert

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        index=True,
        description="Unique identifier (v4)."
    )
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        description="References USERS(id)."
    )
    mental_wellness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        description="Calculated well-being metric (0.0 to 100.0)."
    )
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, name="risk_level"),
        nullable=False,
        description="Assessed risk level ('LOW', 'MEDIUM', 'HIGH')."
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        description="Timestamp of evaluation completion."
    )

    # Relationships
    student: Mapped["User"] = relationship(back_populates="assessments")
    alert: Mapped[Optional["Alert"]] = relationship(
        back_populates="assessment",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # Table constraints and indexes
    __table_args__ = (
        CheckConstraint(
            "mental_wellness_score >= 0.0 AND mental_wellness_score <= 100.0",
            name="chk_mental_wellness_score"
        ),
        Index(
            "idx_assessments_student_risk",
            "student_id",
            "risk_level"
        ),
    )
