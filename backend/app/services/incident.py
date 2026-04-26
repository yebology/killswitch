"""Incident service — business logic for incident record creation."""

import logging
from datetime import datetime
from uuid import UUID

from app.models.incident import Incident
from app.repositories.incident import IncidentRepository

logger = logging.getLogger(__name__)


class IncidentService:
    """Handles incident creation for detected breaches."""

    def __init__(self, incident_repo: IncidentRepository):
        self.incident_repo = incident_repo

    async def create_incident(
        self,
        protocol_id: UUID,
        invariant_id: UUID,
        trigger_time: datetime,
        tx_hashes: list[str],
        action_taken: str,
        damage_estimate: float = 0.0,
        escalation_reason: str | None = None,
    ) -> Incident:
        """Create an incident record for a detected invariant breach."""
        incident = Incident(
            protocol_id=protocol_id,
            invariant_id=invariant_id,
            trigger_time=trigger_time,
            tx_hashes=tx_hashes,
            action_taken=action_taken,
            damage_estimate=damage_estimate,
            escalation_reason=escalation_reason,
        )
        created = await self.incident_repo.create(incident)
        logger.info(
            "Incident created: protocol=%s, invariant=%s, action=%s, damage=%.2f",
            protocol_id,
            invariant_id,
            action_taken,
            damage_estimate,
        )
        return created
