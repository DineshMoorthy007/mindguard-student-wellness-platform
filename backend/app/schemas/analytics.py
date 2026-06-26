from pydantic import BaseModel

class RiskDistribution(BaseModel):
    LOW: int
    MEDIUM: int
    HIGH: int

class InstitutionReportResponse(BaseModel):
    total_students_monitored: int
    average_wellness_score: float
    risk_distribution: RiskDistribution
    dominant_campus_emotion: str
