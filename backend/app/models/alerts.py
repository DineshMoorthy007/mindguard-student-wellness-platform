import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4
from sqlalchemy import Enum, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.users import User
    from app.models.assessments import Assessment

class AlertStatus(str, enum.Enum):
    PENDING = "PENDING"
    REVIEWED = "REVIEWED"
    RESOLVED = "RESOLVED"

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        index=True,
        description="Unique identifier (v4)."
    )
    assessment_id: Mapped[UUID] = mapped_column(
        ForeignKey("assessments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        description="References ASSESSMENTS(id) uniquely."
    )
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        description="References USERS(id) for the student who triggered the alert."
    )
    counselor_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        description="References USERS(id) for the counselor assigned to resolve the alert. Nullable if unassigned."
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status"),
        default=AlertStatus.PENDING,
        nullable=False,
        description="Current workflow status of the alert ('PENDING', 'REVIEWED', 'RESOLVED')."
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        description="Timestamp indicating when the alert was triggered."
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        description="Timestamp indicating when the counselor closed and resolved the alert."
    )

    # Relationships
    assessment: Mapped["Assessment"] = relationship(back_populates="alert")
    student: Mapped["User"] = relationship(
        back_populates="triggered_alerts",
        foreign_keys=[student_id]
    )
    counselor: Mapped[Optional["User"]] = relationship(
        back_populates="assigned_alerts",
        foreign_keys=[counselor_id]
    )

    # Table constraints and indexes
    __table_args__ = (
        Index(
            "idx_alerts_status_counselor",
            "status",
            "counselor_id"
        ),
    )
