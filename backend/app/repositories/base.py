from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        Base class for data access layer (Repository Pattern) providing
        standard asynchronous CRUD operations.
        
        Args:
            model: A SQLAlchemy model class.
        """
        self.model = model

    async def get(self, db: AsyncSession, id: Any) -> Optional[ModelType]:
        """
        Retrieve a single database record by its primary key.
        
        Args:
            db: The async database session.
            id: The primary key of the record.
            
        Returns:
            The model instance, or None if not found.
        """
        return await db.get(self.model, id)

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """
        Retrieve multiple database records with pagination.
        
        Args:
            db: The async database session.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            
        Returns:
            A list of model instances.
        """
        statement = select(self.model).offset(skip).limit(limit)
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def create(
        self, db: AsyncSession, *, obj_in: Union[CreateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Create a new record in the database.
        
        Args:
            db: The async database session.
            obj_in: Pydantic creation schema or raw dictionary of fields.
            
        Returns:
            The newly created and persisted model instance.
        """
        if isinstance(obj_in, dict):
            obj_in_data = obj_in
        else:
            obj_in_data = obj_in.model_dump(exclude_unset=True)

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update an existing database record.
        
        Args:
            db: The async database session.
            db_obj: The existing database model instance.
            obj_in: Pydantic update schema or raw dictionary of modifications.
            
        Returns:
            The updated and persisted model instance.
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(self, db: AsyncSession, *, id: Any) -> Optional[ModelType]:
        """
        Delete a database record by its primary key.
        
        Args:
            db: The async database session.
            id: The primary key of the record.
            
        Returns:
            The deleted model instance, or None if not found.
        """
        obj = await db.get(self.model, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj
