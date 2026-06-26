from datetime import datetime
from typing import Dict
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.assessments import RiskLevel

class AssessmentLatestResponse(BaseModel):
    assessment_id: UUID
    mental_wellness_score: float
    risk_level: RiskLevel
    emotions_detected: Dict[str, float]
    evaluated_at: datetime
