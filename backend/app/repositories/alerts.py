from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alerts import Alert, AlertStatus
from app.repositories.base import CRUDBase
from pydantic import BaseModel

class AlertRepository(CRUDBase[Alert, BaseModel, BaseModel]):
    async def get_active_alerts(
        self,
        db: AsyncSession,
        *,
        status_filter: Optional[AlertStatus] = None,
        limit: int = 50
    ) -> List[Alert]:
        """
        Fetch active alerts for counselors, optionally filtering by status.
        """
        statement = select(self.model)
        if status_filter:
            statement = statement.where(self.model.status == status_filter)
        
        statement = statement.order_by(self.model.created_at.desc()).limit(limit)
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_alerts_count(
        self,
        db: AsyncSession,
        *,
        status_filter: Optional[AlertStatus] = None
    ) -> int:
        """
        Get the total count of alerts (useful for pagination metrics).
        """
        statement = select(func.count(self.model.id))
        if status_filter:
            statement = statement.where(self.model.status == status_filter)
            
        result = await db.execute(statement)
        return result.scalar() or 0

alert_repository = AlertRepository(Alert)
