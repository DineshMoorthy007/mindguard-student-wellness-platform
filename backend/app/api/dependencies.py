from typing import List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_token
from app.models.users import User, UserRole
from app.services.user import user_service

# Use HTTPBearer to read the Authorization header
oauth2_scheme = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract, decode, and validate the JWT from the request header,
    retrieving the corresponding active user model from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error_code": "UNAUTHORIZED",
            "message": "Could not validate credentials.",
            "details": {}
        }
    )

    try:
        payload = decode_token(token.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # Verify it's an access token (not a refresh token)
        if token_type != "access" or user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    user = await user_service.get_user_by_id(db, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "USER_NOT_FOUND",
                "message": "The user associated with this token does not exist.",
                "details": {}
            }
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "User account is deactivated.",
                "details": {}
            }
        )

    return user

def require_role(allowed_roles: List[UserRole]):
    """
    FastAPI RBAC dependency creator to enforce required user roles on endpoints.
    """
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "FORBIDDEN",
                    "message": "Operation not permitted for this role.",
                    "details": {}
                }
            )
        return current_user
    return dependency
