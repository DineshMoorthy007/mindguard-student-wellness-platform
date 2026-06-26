from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.api.dependencies import require_role
from app.models.users import User, UserRole
from app.models.alerts import AlertStatus
from app.schemas.alerts import ActiveAlertsResponse, AlertUpdateRequest, AlertUpdateResponse
from app.services.alerts import alert_service

router = APIRouter()

@router.get(
    "/alerts",
    response_model=ActiveAlertsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active high-risk alerts queue"
)
async def get_active_alerts(
    status_filter: Optional[AlertStatus] = Query(None, alias="status", description="Filter by alert status: PENDING, REVIEWED, RESOLVED"),
    limit: int = Query(50, ge=1, le=100, description="Max results limit"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.COUNSELOR]))
):
    """
    Retrieves the queue of outstanding high-risk assessments for clinic staff.
    """
    alerts, total = await alert_service.get_active_alerts(
        db, status_filter=status_filter, limit=limit
    )
    
    return ActiveAlertsResponse(alerts=alerts, total=total)

@router.put(
    "/alerts/{alert_id}",
    response_model=AlertUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update alert status classification"
)
async def update_alert_status(
    alert_id: UUID,
    payload: AlertUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.COUNSELOR]))
):
    """
    Allows clinic counselors to claim (REVIEWED) or close out (RESOLVED) high-risk warning alerts.
    """
    updated_alert = await alert_service.update_alert_status(
        db,
        alert_id=alert_id,
        status_update=payload.status,
        counselor=current_user
    )
    
    return updated_alert
