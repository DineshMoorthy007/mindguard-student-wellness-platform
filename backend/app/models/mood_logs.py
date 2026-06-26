import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4
from sqlalchemy import String, Enum, Integer, Text, DateTime, ForeignKey, CheckConstraint, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.users import User
    from app.models.emotion_analyses import EmotionAnalysis

class InputType(str, enum.Enum):
    TEXT = "TEXT"
    VOICE = "VOICE"
    SURVEY = "SURVEY"

class MoodLog(Base):
    __tablename__ = "mood_logs"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        index=True,
        comment="Unique identifier (v4)."
    )
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="References USERS(id)."
    )
    input_type: Mapped[InputType] = mapped_column(
        Enum(InputType, name="input_type"),
        nullable=False,
        comment="Type of input: TEXT, VOICE, or SURVEY."
    )
    raw_content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="The actual journal entry text or transcript."
    )
    self_reported_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Subjective mental score (1 to 10)."
    )
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="Timestamp of journal submission."
    )

    # Relationships
    student: Mapped["User"] = relationship(back_populates="mood_logs")
    emotion_analysis: Mapped[Optional["EmotionAnalysis"]] = relationship(
        back_populates="mood_log",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # Table constraints and indexes
    __table_args__ = (
        CheckConstraint(
            "self_reported_score >= 1 AND self_reported_score <= 10",
            name="chk_self_reported_score"
        ),
        Index(
            "idx_mood_logs_student_date",
            "student_id",
            text("logged_at DESC")
        ),
    )
