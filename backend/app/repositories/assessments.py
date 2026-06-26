from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.assessments import Assessment
from app.repositories.base import CRUDBase
from pydantic import BaseModel

class AssessmentRepository(CRUDBase[Assessment, BaseModel, BaseModel]):
    async def get_latest_for_student(
        self,
        db: AsyncSession,
        student_id: UUID
    ) -> Optional[Assessment]:
        """
        Retrieve the most recent assessment evaluation record for a student.
        """
        statement = (
            select(self.model)
            .where(self.model.student_id == student_id)
            .order_by(self.model.evaluated_at.desc())
            .limit(1)
        )
        result = await db.execute(statement)
        return result.scalars().first()

assessment_repository = AssessmentRepository(Assessment)
