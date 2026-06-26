from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.dependencies import require_role
from app.models.users import User, UserRole
from app.schemas.users import UserProfileResponse, UserDirectoryResponse
from app.services.user import user_service

# Define separate routers to mount under different paths as per API.md paths
students_router = APIRouter()
admin_router = APIRouter()

@students_router.get(
    "/me",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current student profile"
)
async def get_student_profile(
    current_user: User = Depends(require_role([UserRole.STUDENT]))
):
    """
    Retrieves the profile information for the authenticated student.
    """
    return current_user

@admin_router.get(
    "/users",
    response_model=UserDirectoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user directory (paginated)"
)
async def get_user_directory(
    role: Optional[UserRole] = Query(None, description="Filter users by role"),
    page: int = Query(1, ge=1, description="Page number"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """
    Retrieves a paginated list of all users registered in the system. Accessible only by Institution Admins.
    """
    users, total_pages = await user_service.get_users_directory(
        db,
        role=role,
        page=page,
        page_size=10
    )
    
    return UserDirectoryResponse(
        users=users,
        page=page,
        total_pages=total_pages
    )
