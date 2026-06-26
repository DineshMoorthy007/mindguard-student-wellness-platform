from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.users import UserRole

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(..., description="Role of the user (STUDENT, COUNSELOR, ADMIN)")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Cleartext password (min 8 characters)")

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Schema specific to registration API response
class UserRegisterResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole

    class Config:
        from_attributes = True

# Schema for profile endpoint response
class UserProfileResponse(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class AdminUserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

class UserDirectoryResponse(BaseModel):
    users: list[AdminUserResponse]
    page: int
    total_pages: int
