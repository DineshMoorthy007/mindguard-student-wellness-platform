from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.models.users import User, UserRole
from app.schemas.notifications import NotificationsResponse, NotificationReadResponse
from app.services.alerts import alert_service

router = APIRouter()

@router.get(
    "",
    response_model=NotificationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unread user notifications"
)
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves system notifications for the authenticated student or counselor.
    """
    notifications = await alert_service.get_user_notifications(db, user=current_user)
    return NotificationsResponse(notifications=notifications)

@router.put(
    "/{notification_id}/read",
    response_model=NotificationReadResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read"
)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a notification as read and acknowledges it.
    """
    await alert_service.mark_notification_read(db, notification_id=notification_id, user=current_user)
    
    return NotificationReadResponse(
        id=notification_id,
        is_read=True
    )
