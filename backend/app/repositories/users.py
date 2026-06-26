from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.users import User
from app.schemas.users import UserCreate, UserUpdate
from app.repositories.base import CRUDBase

class UserRepository(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Retrieve a user record from the database by email address.
        """
        statement = select(self.model).where(self.model.email == email)
        result = await db.execute(statement)
        return result.scalars().first()

user_repository = UserRepository(User)
