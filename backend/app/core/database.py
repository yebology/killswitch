"""SQLAlchemy async engine, session factory, and declarative base."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

engine = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy models."""

    pass


def init_db(database_url: str) -> None:
    """Initialize the async SQLAlchemy engine and session factory."""
    global engine, async_session_factory
    engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
    async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    if async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with async_session_factory() as session:
        yield session
