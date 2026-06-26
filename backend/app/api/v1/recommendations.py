from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import require_role
from app.models.users import User, UserRole
from app.models.assessments import RiskLevel
from app.models.mood_logs import MoodLog
from app.models.emotion_analyses import EmotionAnalysis
from app.repositories.assessments import assessment_repository
from app.services.recommendations import recommendation_service
from app.schemas.recommendations import RecommendationResponse

router = APIRouter()

@router.get(
    "/current",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current wellness recommendations"
)
async def get_current_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Retrieves personalized wellness suggestions based on the student's latest assessment score
    and primary emotion. Employs fallback defaults for new accounts to solve cold-start issues.
    """
    # 1. Fetch latest assessment
    assessment = await assessment_repository.get_latest_for_student(db, student_id=current_user.id)
    
    if not assessment:
        # Cold start fallback defaults
        return recommendation_service.get_recommendations_for_profile(
            risk_level=RiskLevel.LOW,
            primary_emotion="joy"
        )

    # 2. Query latest primary emotion
    statement = (
        select(EmotionAnalysis)
        .join(MoodLog)
        .where(MoodLog.student_id == current_user.id)
        .order_by(EmotionAnalysis.analyzed_at.desc())
        .limit(1)
    )
    result = await db.execute(statement)
    latest_analysis = result.scalars().first()
    primary_emotion = latest_analysis.primary_emotion if latest_analysis else "anxiety"

    # 3. Retrieve activities based on mapping matrix
    return recommendation_service.get_recommendations_for_profile(
        risk_level=assessment.risk_level,
        primary_emotion=primary_emotion
    )
