"""Protocol repository — async database operations for Protocol entities."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.protocol import Protocol


class ProtocolRepository:
    """Async repository for Protocol CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, protocol: Protocol) -> Protocol:
        """Insert a new protocol and return it."""
        self.session.add(protocol)
        await self.session.commit()
        await self.session.refresh(protocol)
        return protocol

    async def find_by_id(self, id: UUID) -> Protocol | None:
        """Find a protocol by primary key, eagerly loading invariants."""
        stmt = (
            select(Protocol)
            .where(Protocol.id == id)
            .options(selectinload(Protocol.invariants))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_guardian_wallet(self, wallet: str) -> list[Protocol]:
        """List all protocols owned by a guardian wallet."""
        stmt = (
            select(Protocol)
            .where(Protocol.guardian_wallet == wallet)
            .options(selectinload(Protocol.invariants))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def find_by_program_address(self, address: str) -> Protocol | None:
        """Find a protocol by its unique program address."""
        stmt = select(Protocol).where(Protocol.program_address == address)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_all_active(self) -> list[Protocol]:
        """List all protocols with status 'active'."""
        stmt = (
            select(Protocol)
            .where(Protocol.status == "active")
            .options(selectinload(Protocol.invariants))
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_status(self, id: UUID, status: str) -> None:
        """Update the status field of a protocol."""
        protocol = await self.session.get(Protocol, id)
        if protocol:
            protocol.status = status
            await self.session.commit()
