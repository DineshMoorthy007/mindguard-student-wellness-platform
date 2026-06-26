from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.users import User, UserRole
from app.models.assessments import Assessment
from app.models.mood_logs import MoodLog
from app.models.emotion_analyses import EmotionAnalysis
from app.repositories.assessments import assessment_repository
from app.schemas.predictions import AssessmentLatestResponse

router = APIRouter()

@router.get(
    "/assessment/latest",
    response_model=AssessmentLatestResponse,
    status_code=status.HTTP_200_OK,
    summary="Get latest wellness assessment and NLP emotions"
)
async def get_latest_assessment(
    student_id: Optional[UUID] = Query(None, description="Student ID (required for counselors)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the most recent mental wellness score, risk level, and emotion vector.
    Students can access their own; counselors can query any student by ID.
    """
    # 1. Enforce RBAC rules and select target student ID
    if current_user.role == UserRole.COUNSELOR:
        if not student_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_code": "STUDENT_ID_REQUIRED",
                    "message": "Counselors must provide a 'student_id' query parameter.",
                    "details": {}
                }
            )
        target_student_id = student_id
    elif current_user.role == UserRole.STUDENT:
        target_student_id = current_user.id
    else:
        # Admins are not permitted
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "Institution Administrators do not have access to clinical profiles.",
                "details": {}
            }
        )

    # 2. Retrieve latest assessment
    assessment = await assessment_repository.get_latest_for_student(db, student_id=target_student_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "ASSESSMENT_NOT_FOUND",
                "message": "No wellness assessment records found for this student.",
                "details": {}
            }
        )

    # 3. Retrieve latest emotion analysis for emotional mapping
    statement = (
        select(EmotionAnalysis)
        .join(MoodLog)
        .where(MoodLog.student_id == target_student_id)
        .order_by(EmotionAnalysis.analyzed_at.desc())
        .limit(1)
    )
    result = await db.execute(statement)
    latest_analysis = result.scalars().first()
    emotions = latest_analysis.detected_emotions if latest_analysis else {}

    return AssessmentLatestResponse(
        assessment_id=assessment.id,
        mental_wellness_score=assessment.mental_wellness_score,
        risk_level=assessment.risk_level,
        emotions_detected=emotions,
        evaluated_at=assessment.evaluated_at
    )
