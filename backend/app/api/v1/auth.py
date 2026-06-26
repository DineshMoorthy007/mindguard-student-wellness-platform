from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.users import UserCreate, UserRegisterResponse
from app.services.auth import auth_service
from app.services.user import user_service

router = APIRouter()

@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new user record in the system database. Returns standard registration representation.
    """
    new_user = await user_service.register_user(db, user_in)
    return new_user

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate credentials and retrieve JWT tokens"
)
async def login(
    login_in: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates user credentials. On success, returns the short-lived access token in the JSON response,
    and sets the long-lived refresh token in a secure, HttpOnly cookie.
    """
    tokens = await auth_service.authenticate_user(db, login_in)
    
    # Set the refresh token as a secure HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=True,  # In production, forces HTTPS transmission
        samesite="strict",
        max_age=7 * 24 * 3600  # 7 days in seconds
    )
    
    return tokens

@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh an expired access token"
)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Consumes a secure refresh token from the browser cookie, validates it, and issues a new
    pair of access and refresh tokens.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "UNAUTHORIZED",
                "message": "Refresh token is missing from browser cookies.",
                "details": {}
            }
        )

    tokens = await auth_service.refresh_tokens(db, refresh_token)

    # Rotate the refresh token by setting the new one in cookie
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=7 * 24 * 3600
    )

    return tokens
