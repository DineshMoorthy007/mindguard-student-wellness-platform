from fastapi import APIRouter, Depends, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.api.dependencies import require_role
from app.models.users import User, UserRole
from app.schemas.mood import JournalSubmissionRequest, JournalSubmissionResponse, MoodHistoryResponse
from app.services.mood import mood_service, process_journal_entry_background

mood_router = APIRouter()
journal_router = APIRouter()

@mood_router.get(
    "/history",
    response_model=MoodHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user mood journal timeline history"
)
async def get_mood_history(
    timeframe: Optional[str] = Query("7d", description="Filter timeframe: 7d or 30d"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Fetches the historical mood logging entries for the authenticated student.
    """
    history = await mood_service.get_history(db, student_id=current_user.id, timeframe=timeframe)
    return MoodHistoryResponse(history=history)

@journal_router.post(
    "/entries",
    response_model=JournalSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit journal entry for async emotional evaluation"
)
async def submit_journal_entry(
    payload: JournalSubmissionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Ingests raw student journal text. Persists details to the database immediately and delegates
    the NLP sentiment mapping and clinical assessment task to background execution threads.
    """
    # 1. Persist raw mood log
    mood_log = await mood_service.create_journal_entry(
        db,
        student_id=current_user.id,
        content=payload.content,
        self_reported_score=payload.self_reported_score
    )
    
    # 2. Queue background NLP and Risk assessment task
    background_tasks.add_task(
        process_journal_entry_background,
        mood_log_id=mood_log.id,
        content=payload.content,
        self_reported_score=payload.self_reported_score,
        student_id=current_user.id
    )
    
    return JournalSubmissionResponse(
        mood_log_id=mood_log.id,
        status="processing",
        message="Journal entry saved. Analysis in progress."
    )
