import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.ml.inference import ml_service
from app.models.mood_logs import MoodLog, InputType
from app.models.emotion_analyses import EmotionAnalysis
from app.models.assessments import Assessment, RiskLevel
from app.models.alerts import Alert, AlertStatus
from app.repositories.mood_logs import mood_log_repository
from app.repositories.emotion_analyses import emotion_analysis_repository
from app.repositories.assessments import assessment_repository
from app.repositories.alerts import alert_repository

logger = logging.getLogger("mindguard-mood-service")

async def process_journal_entry_background(
    mood_log_id: UUID,
    content: str,
    self_reported_score: int,
    student_id: UUID
) -> None:
    """
    Background worker task to execute ML evaluations asynchronously.
    Performs PII redaction and inference, saves emotional probability vectors,
    calculates clinical wellness indices, and triggers Early Warning Alerts if high-risk.
    """
    logger.info(f"Asynchronously processing mood log ID: {mood_log_id}...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Trigger joint ML inference (Emotion + Risk mapping)
            detected_emotions, mental_wellness_score, risk_level = await ml_service.predict(
                content, self_reported_score
            )
            
            # 2. Derive sentiment polarity and primary emotion
            primary_emotion = max(detected_emotions, key=detected_emotions.get)
            sentiment_score = detected_emotions.get("joy", 0.0) - (
                detected_emotions.get("anxiety", 0.0) * 0.5 + detected_emotions.get("sadness", 0.0) * 0.5
            )
            sentiment_score = max(-1.0, min(1.0, sentiment_score))
            
            # 3. Persist Emotion Analysis records
            analysis_obj = EmotionAnalysis(
                mood_log_id=mood_log_id,
                detected_emotions=detected_emotions,
                sentiment_score=sentiment_score,
                primary_emotion=primary_emotion
            )
            db.add(analysis_obj)

            # 4. Save Wellness Assessment
            assessment_obj = Assessment(
                student_id=student_id,
                mental_wellness_score=mental_wellness_score,
                risk_level=RiskLevel(risk_level)
            )
            db.add(assessment_obj)
            
            # We flush to get assessment_obj.id for Alert mapping
            await db.flush()

            # 5. Decision Diamond: Trigger Alert if risk_level is HIGH
            if risk_level == "HIGH":
                logger.warning(f"HIGH risk level flagged for student {student_id}. Triggering active alert.")
                alert_obj = Alert(
                    assessment_id=assessment_obj.id,
                    student_id=student_id,
                    counselor_id=None,  # Unassigned initially
                    status=AlertStatus.PENDING
                )
                db.add(alert_obj)
            
            await db.commit()
            logger.info(f"Asynchronous analysis successfully committed for mood log ID {mood_log_id}.")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to process background mood log analysis {mood_log_id}: {str(e)}", exc_info=True)

class MoodService:
    async def create_journal_entry(
        self,
        db,  # AsyncSession
        *,
        student_id: UUID,
        content: str,
        self_reported_score: int
    ) -> MoodLog:
        """
        Creates a raw mood log in the database.
        """
        db_obj_data = {
            "student_id": student_id,
            "input_type": InputType.TEXT,
            "raw_content": content,
            "self_reported_score": self_reported_score
        }
        return await mood_log_repository.create(db, obj_in=db_obj_data)

    async def get_history(
        self,
        db,  # AsyncSession
        student_id: UUID,
        timeframe: Optional[str] = "7d"
    ) -> List[MoodLog]:
        """
        Fetch journal history filtered by timeframe (7d or 30d).
        """
        days = 7
        if timeframe == "30d":
            days = 30
        return await mood_log_repository.get_student_history(db, student_id, timeframe_days=days)

mood_service = MoodService()
