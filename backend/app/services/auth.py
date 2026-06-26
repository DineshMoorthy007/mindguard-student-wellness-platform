from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.services.user import user_service
from fastapi import HTTPException, status

class AuthService:
    async def authenticate_user(self, db: AsyncSession, login_in: LoginRequest) -> TokenResponse:
        """
        Authenticate a user by checking email and password, returning JWT access & refresh tokens.
        """
        user = await user_service.get_user_by_email(db, login_in.email)
        if not user or not verify_password(login_in.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": "UNAUTHORIZED",
                    "message": "Invalid email or password.",
                    "details": {}
                }
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "FORBIDDEN",
                    "message": "This account is inactive.",
                    "details": {}
                }
            )

        # Generate access and refresh tokens
        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id, role=user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=900  # 15 minutes in seconds
        )

    async def refresh_tokens(self, db: AsyncSession, refresh_token: str) -> TokenResponse:
        """
        Validate a refresh token and return a newly issued pair of tokens.
        """
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError("Token is not a refresh token.")
            user_id = payload.get("sub")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": "UNAUTHORIZED",
                    "message": "Invalid or expired refresh token.",
                    "details": {}
                }
            )

        user = await user_service.get_user_by_id(db, UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": "UNAUTHORIZED",
                    "message": "User does not exist or is inactive.",
                    "details": {}
                }
            )

        # Generate new pair of tokens
        access_token = create_access_token(subject=user.id, role=user.role.value)
        new_refresh_token = create_refresh_token(subject=user.id, role=user.role.value)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=900
        )

auth_service = AuthService()
