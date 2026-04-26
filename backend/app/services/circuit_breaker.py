"""Circuit breaker service — triggers on-chain pause/resume via Guardian Program."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from app.clients.solana import SolanaClient
from app.constants import PROTOCOL_STATUS_ACTIVE, PROTOCOL_STATUS_PAUSED
from app.repositories.incident import IncidentRepository
from app.repositories.protocol import ProtocolRepository
from app.services.evaluator import EvaluationResult

logger = logging.getLogger(__name__)


class CircuitBreakerService:
    """Triggers on-chain pause/resume and records incidents."""

    def __init__(
        self,
        solana_client: SolanaClient,
        protocol_repo: ProtocolRepository,
        incident_repo: IncidentRepository,
        telegram_dispatcher=None,
    ):
        self.solana_client = solana_client
        self.protocol_repo = protocol_repo
        self.incident_repo = incident_repo
        self.telegram_dispatcher = telegram_dispatcher

    async def trigger_pause(
        self,
        protocol_id: UUID,
        program_address: str,
        protocol_name: str,
        telegram_chat_id: str | None,
        result: EvaluationResult,
        tx_hashes: list[str],
    ) -> None:
        """Trigger on-chain pause, update DB status, and create incident."""
        try:
            # Send pause TX to Guardian Program
            pause_tx = await self.solana_client.trigger_pause(program_address)
            logger.info(
                "Circuit breaker triggered for %s — TX: %s",
                protocol_name,
                pause_tx,
            )
        except Exception:
            logger.exception(
                "CRITICAL: Failed to trigger on-chain pause for %s",
                protocol_name,
            )
            # Dispatch emergency alert on TX failure
            if self.telegram_dispatcher and telegram_chat_id:
                await self.telegram_dispatcher.dispatch_emergency_alert(
                    protocol_name=protocol_name,
                    chat_id=telegram_chat_id,
                    message=f"EMERGENCY: Failed to pause {protocol_name} on-chain!",
                )
            return

        # Update protocol status in DB
        await self.protocol_repo.update_status(protocol_id, PROTOCOL_STATUS_PAUSED)

        # Create incident record
        from app.models.incident import Incident

        primary_rule = result.breached_rules[0] if result.breached_rules else None
        incident = Incident(
            protocol_id=protocol_id,
            invariant_id=primary_rule.invariant_id if primary_rule else protocol_id,
            trigger_time=datetime.now(timezone.utc),
            tx_hashes=tx_hashes,
            action_taken="pause",
            damage_estimate=primary_rule.measured_value if primary_rule else 0.0,
            escalation_reason=result.escalation_reason,
        )
        await self.incident_repo.create(incident)

    async def resume(self, protocol_id: UUID, program_address: str) -> None:
        """Resume a paused protocol on-chain and update DB status."""
        await self.solana_client.resume(program_address)
        await self.protocol_repo.update_status(protocol_id, PROTOCOL_STATUS_ACTIVE)
        logger.info("Protocol %s resumed", protocol_id)
