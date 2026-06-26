from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.db.session import get_db
from app.api.dependencies import require_role
from app.models.users import User, UserRole
from app.models.mood_logs import MoodLog, InputType
from app.models.assessments import Assessment, RiskLevel
from app.models.alerts import Alert, AlertStatus
from app.schemas.surveys import PHQ9SubmissionRequest, GAD7SubmissionRequest, SurveySubmissionResponse

router = APIRouter()

def get_phq9_severity(score: int) -> str:
    if score <= 4:
        return "Minimal Depression"
    elif score <= 9:
        return "Mild Depression"
    elif score <= 14:
        return "Moderate Depression"
    elif score <= 19:
        return "Moderately Severe Depression"
    else:
        return "Severe Depression"

def get_gad7_severity(score: int) -> str:
    if score <= 4:
        return "Minimal Anxiety"
    elif score <= 9:
        return "Mild Anxiety"
    elif score <= 14:
        return "Moderate Anxiety"
    else:
        return "Severe Anxiety"

@router.post(
    "/phq-9",
    response_model=SurveySubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit PHQ-9 clinical survey"
)
async def submit_phq9_survey(
    payload: PHQ9SubmissionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Submits a Student Patient Health Questionnaire (PHQ-9). Calculates depressive indicators,
    saves the log, generates a wellness assessment, and routes to early counselor alerts on high scores.
    """
    total_score = sum(payload.responses)
    severity = get_phq9_severity(total_score)
    
    # Map clinical score to a 0.0 - 100.0 wellness score (lower clinical score is higher wellness)
    wellness_score = round((1.0 - (total_score / 27.0)) * 100.0, 2)
    
    # Map to risk level based on clinical thresholds
    if total_score >= 15:
        risk_level = RiskLevel.HIGH
    elif total_score >= 10:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    # 1. Save MoodLog reference for survey action
    mood_log = MoodLog(
        id=uuid4(),
        student_id=current_user.id,
        input_type=InputType.SURVEY,
        raw_content=f"PHQ-9 Raw Responses: {str(payload.responses)}",
        self_reported_score=max(1, min(10, int(round((1.0 - (total_score / 27.0)) * 10.0))))
    )
    db.add(mood_log)
    
    # 2. Persist Assessment
    assessment = Assessment(
        id=uuid4(),
        student_id=current_user.id,
        mental_wellness_score=wellness_score,
        risk_level=risk_level
    )
    db.add(assessment)
    await db.flush()

    # 3. Decision Diamond Alert routing
    if risk_level == RiskLevel.HIGH:
        alert = Alert(
            assessment_id=assessment.id,
            student_id=current_user.id,
            counselor_id=None,
            status=AlertStatus.PENDING
        )
        db.add(alert)
        
    await db.commit()
    
    return SurveySubmissionResponse(
        survey_id=assessment.id,  # Match survey_id representation
        total_score=total_score,
        severity=severity,
        logged_at=assessment.evaluated_at
    )

@router.post(
    "/gad-7",
    response_model=SurveySubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit GAD-7 clinical survey"
)
async def submit_gad7_survey(
    payload: GAD7SubmissionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Submits a Generalized Anxiety Disorder (GAD-7) survey. Integrates anxiety indicators,
    generating early warnings on high risk.
    """
    total_score = sum(payload.responses)
    severity = get_gad7_severity(total_score)
    
    # Map GAD-7 to 0.0 - 100.0 wellness score
    wellness_score = round((1.0 - (total_score / 21.0)) * 100.0, 2)
    
    if total_score >= 10:
        risk_level = RiskLevel.HIGH
    elif total_score >= 5:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    # 1. Save MoodLog reference
    mood_log = MoodLog(
        id=uuid4(),
        student_id=current_user.id,
        input_type=InputType.SURVEY,
        raw_content=f"GAD-7 Raw Responses: {str(payload.responses)}",
        self_reported_score=max(1, min(10, int(round((1.0 - (total_score / 21.0)) * 10.0))))
    )
    db.add(mood_log)
    
    # 2. Persist Assessment
    assessment = Assessment(
        id=uuid4(),
        student_id=current_user.id,
        mental_wellness_score=wellness_score,
        risk_level=risk_level
    )
    db.add(assessment)
    await db.flush()

    # 3. Decision Diamond Alert routing
    if risk_level == RiskLevel.HIGH:
        alert = Alert(
            assessment_id=assessment.id,
            student_id=current_user.id,
            counselor_id=None,
            status=AlertStatus.PENDING
        )
        db.add(alert)
        
    await db.commit()
    
    return SurveySubmissionResponse(
        survey_id=assessment.id,
        total_score=total_score,
        severity=severity,
        logged_at=assessment.evaluated_at
    )
