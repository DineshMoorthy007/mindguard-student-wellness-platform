from datetime import datetime
from typing import List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

class SurveySubmissionRequest(BaseModel):
    responses: List[int] = Field(..., description="Array of answers matching standard scores (0 to 3)")

    @field_validator("responses")
    @classmethod
    def validate_responses_range(cls, v: List[int]) -> List[int]:
        for idx, score in enumerate(v):
            if score < 0 or score > 3:
                raise ValueError(f"Response at index {idx} must be between 0 and 3.")
        return v

class PHQ9SubmissionRequest(SurveySubmissionRequest):
    @field_validator("responses")
    @classmethod
    def validate_phq9_length(cls, v: List[int]) -> List[int]:
        if len(v) != 9:
            raise ValueError("PHQ-9 survey must contain exactly 9 answers.")
        return v

class GAD7SubmissionRequest(SurveySubmissionRequest):
    @field_validator("responses")
    @classmethod
    def validate_gad7_length(cls, v: List[int]) -> List[int]:
        if len(v) != 7:
            raise ValueError("GAD-7 survey must contain exactly 7 answers.")
        return v

class SurveySubmissionResponse(BaseModel):
    survey_id: UUID
    total_score: int
    severity: str
    logged_at: datetime
