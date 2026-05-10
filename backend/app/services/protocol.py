"""Protocol service — business logic for protocol registration and management."""

import logging
from uuid import UUID

from app.clients.solana import SolanaClient
from app.constants import (
    ERR_PROTOCOL_ALREADY_EXISTS,
    ERR_PROTOCOL_NOT_FOUND,
    PROTOCOL_STATUS_ACTIVE,
)
from app.core.exceptions import AppError
from app.models.protocol import Protocol
from app.repositories.protocol import ProtocolRepository
from app.schemas.requests import RegisterProtocolRequest
from app.schemas.responses import ProtocolResponse

logger = logging.getLogger(__name__)


class ProtocolService:
    """Handles protocol registration, retrieval, listing, and resume."""

    def __init__(
        self,
        protocol_repo: ProtocolRepository,
        solana_client: SolanaClient | None = None,
    ):
        self.protocol_repo = protocol_repo
        self.solana_client = solana_client

    async def register_protocol(
        self, req: RegisterProtocolRequest, guardian_wallet: str
    ) -> ProtocolResponse:
        """Register a new protocol for monitoring."""
        # Check for duplicate program address
        existing = await self.protocol_repo.find_by_program_address(
            req.program_address
        )
        if existing:
            raise AppError(409, ERR_PROTOCOL_ALREADY_EXISTS)

        protocol = Protocol(
            program_address=req.program_address,
            name=req.name,
            guardian_wallet=guardian_wallet,
            telegram_chat_id=req.telegram_chat_id,
            status=PROTOCOL_STATUS_ACTIVE,
        )
        created = await self.protocol_repo.create(protocol)
        logger.info(
            "Protocol registered: %s (%s) by %s",
            created.name,
            created.program_address,
            guardian_wallet,
        )
        return ProtocolResponse(
            id=created.id,
            program_address=created.program_address,
            name=created.name,
            guardian_wallet=created.guardian_wallet,
            telegram_chat_id=created.telegram_chat_id,
            status=created.status,
            created_at=created.created_at,
            invariants=[],
        )

    async def get_protocol(
        self, protocol_id: UUID, guardian_wallet: str
    ) -> ProtocolResponse:
        """Get a protocol by ID, verifying ownership."""
        protocol = await self.protocol_repo.find_by_id(protocol_id)
        if not protocol or protocol.guardian_wallet != guardian_wallet:
            raise AppError(404, ERR_PROTOCOL_NOT_FOUND)
        return ProtocolResponse.model_validate(protocol)

    async def list_protocols(self, guardian_wallet: str) -> list[ProtocolResponse]:
        """List all protocols owned by a guardian wallet."""
        protocols = await self.protocol_repo.find_by_guardian_wallet(guardian_wallet)
        return [ProtocolResponse.model_validate(p) for p in protocols]

    async def resume_protocol(
        self, protocol_id: UUID, guardian_wallet: str
    ) -> ProtocolResponse:
        """Resume a paused protocol."""
        protocol = await self.protocol_repo.find_by_id(protocol_id)
        if not protocol or protocol.guardian_wallet != guardian_wallet:
            raise AppError(404, ERR_PROTOCOL_NOT_FOUND)

        # Call Solana client to resume on-chain (stub)
        if self.solana_client:
            await self.solana_client.resume(protocol.program_address)

        await self.protocol_repo.update_status(protocol_id, PROTOCOL_STATUS_ACTIVE)
        logger.info("Protocol resumed: %s", protocol.name)

        # Re-fetch to get updated status
        updated = await self.protocol_repo.find_by_id(protocol_id)
        return ProtocolResponse.model_validate(updated)
