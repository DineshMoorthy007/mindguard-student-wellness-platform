from datetime import datetime
from typing import Any, Dict, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlalchemy import Float, String, DateTime, ForeignKey, CheckConstraint, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.mood_logs import MoodLog

class EmotionAnalysis(Base):
    __tablename__ = "emotion_analyses"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        index=True,
        description="Unique identifier (v4)."
    )
    mood_log_id: Mapped[UUID] = mapped_column(
        ForeignKey("mood_logs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        description="References MOOD_LOGS(id) uniquely."
    )
    detected_emotions: Mapped[Dict[str, float]] = mapped_column(
        JSONB,
        nullable=False,
        description="Matrix of emotions (e.g. {'joy': 0.1, 'sadness': 0.8})."
    )
    sentiment_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        description="Aggregate NLP polarity score (-1.0 to 1.0)."
    )
    primary_emotion: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        description="Dominant extracted emotion."
    )
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        description="ML inference completion timestamp."
    )

    # Relationships
    mood_log: Mapped["MoodLog"] = relationship(back_populates="emotion_analysis")

    # Table constraints and indexes
    __table_args__ = (
        CheckConstraint(
            "sentiment_score >= -1.0 AND sentiment_score <= 1.0",
            name="chk_sentiment_score"
        ),
        Index(
            "idx_emotions_jsonb",
            "detected_emotions",
            postgresql_using="gin"
        ),
    )
