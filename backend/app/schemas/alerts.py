from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.alerts import AlertStatus

class AlertItem(BaseModel):
    id: UUID
    student_id: UUID
    assessment_id: UUID
    status: AlertStatus
    created_at: datetime

    class Config:
        from_attributes = True

class ActiveAlertsResponse(BaseModel):
    alerts: List[AlertItem]
    total: int

class AlertUpdateRequest(BaseModel):
    status: AlertStatus

class AlertUpdateResponse(BaseModel):
    id: UUID
    status: AlertStatus
    counselor_id: Optional[UUID] = None

    class Config:
        from_attributes = True
