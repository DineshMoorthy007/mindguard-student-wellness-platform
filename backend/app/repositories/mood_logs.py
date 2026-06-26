from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.mood_logs import MoodLog
from app.repositories.base import CRUDBase
from pydantic import BaseModel

class MoodLogRepository(CRUDBase[MoodLog, BaseModel, BaseModel]):
    async def get_student_history(
        self,
        db: AsyncSession,
        student_id: UUID,
        timeframe_days: Optional[int] = None
    ) -> List[MoodLog]:
        """
        Fetch mood log history for a specific student, optionally filtered by timeframe in days.
        """
        statement = select(self.model).where(self.model.student_id == student_id)
        
        if timeframe_days is not None:
            cutoff = datetime.now(timezone.utc) - timedelta(days=timeframe_days)
            statement = statement.where(self.model.logged_at >= cutoff)
            
        statement = statement.order_by(self.model.logged_at.desc())
        result = await db.execute(statement)
        return list(result.scalars().all())

mood_log_repository = MoodLogRepository(MoodLog)
