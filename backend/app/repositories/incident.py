"""Incident repository — async database operations for Incident entities."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident


class IncidentRepository:
    """Async repository for Incident CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, incident: Incident) -> Incident:
        """Insert a new incident and return it."""
        self.session.add(incident)
        await self.session.commit()
        await self.session.refresh(incident)
        return incident

    async def find_by_id(self, id: UUID) -> Incident | None:
        """Find an incident by primary key."""
        return await self.session.get(Incident, id)

    async def find_by_protocol_id(
        self, protocol_id: UUID
    ) -> list[Incident]:
        """List all incidents for a given protocol."""
        stmt = select(Incident).where(
            Incident.protocol_id == protocol_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
