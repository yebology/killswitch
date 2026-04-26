"""Invariant service — business logic for invariant rule management."""

import logging
from uuid import UUID

from app.constants import ERR_PROTOCOL_NOT_FOUND
from app.core.exceptions import AppError
from app.models.invariant import Invariant
from app.repositories.invariant import InvariantRepository
from app.repositories.protocol import ProtocolRepository
from app.schemas.requests import CreateInvariantRequest
from app.schemas.responses import InvariantResponse

logger = logging.getLogger(__name__)


class InvariantService:
    """Handles invariant rule creation and listing."""

    def __init__(
        self,
        invariant_repo: InvariantRepository,
        protocol_repo: ProtocolRepository,
    ):
        self.invariant_repo = invariant_repo
        self.protocol_repo = protocol_repo

    async def create_invariant(
        self, protocol_id: UUID, req: CreateInvariantRequest
    ) -> InvariantResponse:
        """Create a new invariant rule for a protocol.

        Pydantic handles type validation (Literal) and threshold > 0 (gt=0).
        """
        # Verify protocol exists
        protocol = await self.protocol_repo.find_by_id(protocol_id)
        if not protocol:
            raise AppError(404, ERR_PROTOCOL_NOT_FOUND)

        invariant = Invariant(
            protocol_id=protocol_id,
            type=req.type,
            threshold=req.threshold,
            time_window=req.time_window,
            action=req.action,
            enabled=True,
        )
        created = await self.invariant_repo.create(invariant)
        logger.info(
            "Invariant created: %s (threshold=%.2f, window=%ds) for protocol %s",
            created.type,
            created.threshold,
            created.time_window,
            protocol_id,
        )
        return InvariantResponse.model_validate(created)

    async def list_invariants(self, protocol_id: UUID) -> list[InvariantResponse]:
        """List all invariant rules for a protocol."""
        invariants = await self.invariant_repo.find_by_protocol_id(protocol_id)
        return [InvariantResponse.model_validate(inv) for inv in invariants]
