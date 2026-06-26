from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.alerts import Alert, AlertStatus
from app.models.users import User, UserRole
from app.repositories.alerts import alert_repository
from app.schemas.notifications import NotificationItem
from fastapi import HTTPException, status

class AlertService:
    async def get_active_alerts(
        self,
        db: AsyncSession,
        *,
        status_filter: Optional[AlertStatus] = None,
        limit: int = 50
    ) -> Tuple[List[Alert], int]:
        """
        Fetch alerts and count metrics for counselor dashboards.
        """
        alerts = await alert_repository.get_active_alerts(db, status_filter=status_filter, limit=limit)
        total = await alert_repository.get_alerts_count(db, status_filter=status_filter)
        return alerts, total

    async def update_alert_status(
        self,
        db: AsyncSession,
        *,
        alert_id: UUID,
        status_update: AlertStatus,
        counselor: User
    ) -> Alert:
        """
        Update alert state. Assigns current counselor and manages resolution audit dates.
        """
        alert = await alert_repository.get(db, alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "ALERT_NOT_FOUND",
                    "message": "The alert record does not exist.",
                    "details": {}
                }
            )

        # Apply state changes
        alert.status = status_update
        alert.counselor_id = counselor.id
        
        if status_update == AlertStatus.RESOLVED:
            alert.resolved_at = datetime.now(timezone.utc)
        else:
            alert.resolved_at = None

        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        return alert

    async def get_user_notifications(
        self,
        db: AsyncSession,
        user: User
    ) -> List[NotificationItem]:
        """
        Calculates and maps dynamic system notifications based on outstanding alert objects.
        """
        notifications = []
        
        if user.role == UserRole.COUNSELOR:
            # Counselors get notified of PENDING alerts
            alerts = await alert_repository.get_active_alerts(db, status_filter=AlertStatus.PENDING, limit=10)
            for alert in alerts:
                notifications.append(
                    NotificationItem(
                        id=str(alert.id),
                        type="HIGH_RISK_ALERT",
                        message=f"High-Risk mental wellness assessment flagged. Intervention required.",
                        is_read=False,
                        created_at=alert.created_at
                    )
                )
        elif user.role == UserRole.STUDENT:
            # Students get notified if a counselor has claimed or resolved their alert, requesting a follow-up
            statement = (
                alert_repository.model.__table__.select()
                .where(alert_repository.model.student_id == user.id)
                .where(alert_repository.model.status != AlertStatus.PENDING)
                .order_by(alert_repository.model.created_at.desc())
                .limit(5)
            )
            result = await db.execute(statement)
            student_alerts = result.mappings().all()
            for sa in student_alerts:
                notifications.append(
                    NotificationItem(
                        id=str(sa["id"]),
                        type="COUNSELOR_REACHOUT",
                        message="A campus counselor has reviewed your wellness log and requested a check-in meeting.",
                        is_read=sa["status"] == AlertStatus.RESOLVED,
                        created_at=sa["created_at"]
                    )
                )

        # If empty, return a static informative system notification to prevent complete blank state
        if not notifications:
            notifications.append(
                NotificationItem(
                    id="system-welcome",
                    type="SYSTEM_INFO",
                    message="Welcome to MindGuard. Your dashboard and check-ins are fully active.",
                    is_read=True,
                    created_at=datetime.now(timezone.utc)
                )
            )

        return notifications

    async def mark_notification_read(
        self,
        db: AsyncSession,
        notification_id: str,
        user: User
    ) -> bool:
        """
        Handles marking notifications read by transitioning the underlying alert status
        to REVIEWED (for counselor warning notifications) or simply acknowledging them.
        """
        try:
            alert_uuid = UUID(notification_id)
        except ValueError:
            # If it's a static welcome message or custom ID, just return success
            return True

        alert = await alert_repository.get(db, alert_uuid)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_code": "NOTIFICATION_NOT_FOUND",
                    "message": "The notification reference is invalid or has expired.",
                    "details": {}
                }
            )

        # Verify access authority
        if user.role == UserRole.STUDENT and alert.student_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error_code": "FORBIDDEN", "message": "Access restricted.", "details": {}}
            )

        # For counselors, mark underlying alert as REVIEWED
        if user.role == UserRole.COUNSELOR and alert.status == AlertStatus.PENDING:
            alert.status = AlertStatus.REVIEWED
            alert.counselor_id = user.id
            db.add(alert)
            await db.commit()

        return True

alert_service = AlertService()
