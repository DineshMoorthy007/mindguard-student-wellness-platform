from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.models.mood_logs import InputType

class JournalSubmissionRequest(BaseModel):
    content: str = Field(..., max_length=5000, description="The actual journal entry content.")
    self_reported_score: int = Field(..., ge=1, le=10, description="Student's self reported mood score (1-10)")

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Journal content cannot be empty.")
        return v

class JournalSubmissionResponse(BaseModel):
    mood_log_id: UUID
    status: str = "processing"
    message: str = "Journal entry saved. Analysis in progress."

class MoodHistoryItem(BaseModel):
    id: UUID
    input_type: InputType
    self_reported_score: Optional[int] = None
    logged_at: datetime

    class Config:
        from_attributes = True

class MoodHistoryResponse(BaseModel):
    history: List[MoodHistoryItem]
