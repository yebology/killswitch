"""Invariant repository — async database operations for Invariant entities."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invariant import Invariant


class InvariantRepository:
    """Async repository for Invariant CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, invariant: Invariant) -> Invariant:
        """Insert a new invariant and return it."""
        self.session.add(invariant)
        await self.session.commit()
        await self.session.refresh(invariant)
        return invariant

    async def find_by_id(self, id: UUID) -> Invariant | None:
        """Find an invariant by primary key."""
        return await self.session.get(Invariant, id)

    async def find_by_protocol_id(self, protocol_id: UUID) -> list[Invariant]:
        """List all invariants for a given protocol."""
        stmt = select(Invariant).where(
            Invariant.protocol_id == protocol_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def find_enabled_by_protocol_id(
        self, protocol_id: UUID
    ) -> list[Invariant]:
        """List only enabled invariants for a given protocol."""
        stmt = select(Invariant).where(
            Invariant.protocol_id == protocol_id,
            Invariant.enabled == True,  # noqa: E712
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
