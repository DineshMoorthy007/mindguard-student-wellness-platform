from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

class NotificationItem(BaseModel):
    id: str = Field(..., description="Unique notification ID (often references alert ID or custom UUID)")
    type: str = Field(..., description="Notification type (e.g. COUNSELOR_REACHOUT, HIGH_RISK_ALERT)")
    message: str = Field(..., description="Notification text content")
    is_read: bool = Field(default=False, description="Read flag status")
    created_at: datetime = Field(..., description="Generation timestamp")

class NotificationsResponse(BaseModel):
    notifications: List[NotificationItem]

class NotificationReadResponse(BaseModel):
    id: str
    is_read: bool
