from typing import List
from pydantic import BaseModel, Field
from app.models.assessments import RiskLevel

class RecommendationActivity(BaseModel):
    type: str = Field(..., description="Type of recommendation (e.g. MINDFULNESS, ARTICLE)")
    title: str = Field(..., description="Actionable title for the student.")
    url: str = Field(..., description="Reference resource web link.")

class RecommendationResponse(BaseModel):
    risk_level: RiskLevel
    activities: List[RecommendationActivity]
