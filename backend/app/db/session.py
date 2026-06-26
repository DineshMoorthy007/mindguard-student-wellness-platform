from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Determine if SQLAlchemy should echo SQL queries (useful for development debugging)
is_dev = settings.ENVIRONMENT == "development"

# Configure the asynchronous database engine
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=is_dev,
    pool_pre_ping=True,  # Checks connection liveness before executing queries
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Declarative base class for modern SQLAlchemy 2.0 ORM models
class Base(DeclarativeBase):
    pass

# Dependency injection generator for FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
