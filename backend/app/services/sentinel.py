"""Sentinel service — orchestrator for real-time protocol monitoring.

Runs as an asyncio background task. Subscribes to Geyser TX streams,
evaluates transactions against invariant rules, triggers circuit breaker
on breaches, dispatches alerts, and broadcasts updates via WebSocket.
"""

import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.clients.geyser import GeyserClient, ParsedTransaction
from app.repositories.protocol import ProtocolRepository
from app.services.circuit_breaker import CircuitBreakerService
from app.services.evaluator import EvaluatorService
from app.services.telegram import TelegramDispatcher
from app.ws.manager import WebSocketManager

logger = logging.getLogger(__name__)


class SentinelService:
    """Orchestrates real-time monitoring of registered protocols.

    Uses session_factory to create fresh DB sessions per-transaction,
    avoiding stale/closed session issues.

    Lifecycle:
    1. start() — load active protocols, subscribe to Geyser, register callback
    2. on_transaction() — evaluate TX, handle breaches/alerts/pass
    3. stop() — cancel background task, close connections
    """

    # Cooldown after resume — don't re-pause within 30 seconds
    RESUME_COOLDOWN_SECONDS = 30

    def __init__(
        self,
        geyser_client: GeyserClient,
        evaluator: EvaluatorService,
        circuit_breaker: CircuitBreakerService,
        telegram_dispatcher: TelegramDispatcher,
        ws_manager: WebSocketManager,
        session_factory: async_sessionmaker[AsyncSession],
    ):
        self.geyser = geyser_client
        self.evaluator = evaluator
        self.circuit_breaker = circuit_breaker
        self.telegram_dispatcher = telegram_dispatcher
        self.ws_manager = ws_manager
        self.session_factory = session_factory
        self._task: asyncio.Task | None = None
        # Track recently resumed protocols to prevent immediate re-pause
        self._resume_cooldowns: dict[str, float] = {}  # program_address → timestamp

    async def start(self) -> None:
        """Start the sentinel monitoring loop."""
        logger.info("Sentinel starting...")

        # Register transaction callback
        self.geyser.on_transaction(self._on_transaction)

        # Connect to Geyser
        await self.geyser.connect()

        # Load and subscribe to all active protocols
        async with self.session_factory() as session:
            protocol_repo = ProtocolRepository(session)
            active_protocols = await protocol_repo.find_all_active()
            for protocol in active_protocols:
                await self.geyser.subscribe(protocol.program_address)
                logger.info(
                    "Sentinel monitoring: %s (%s)",
                    protocol.name,
                    protocol.program_address,
                )

            logger.info(
                "Sentinel started — monitoring %d protocols", len(active_protocols)
            )

    async def stop(self) -> None:
        """Stop the sentinel and clean up resources."""
        logger.info("Sentinel stopping...")
        await self.geyser.close()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Sentinel stopped")

    async def add_protocol(self, program_address: str) -> None:
        """Subscribe to a newly registered protocol."""
        await self.geyser.subscribe(program_address)
        logger.info("Sentinel now monitoring: %s", program_address)

    async def remove_protocol(self, program_address: str) -> None:
        """Unsubscribe from a protocol."""
        await self.geyser.unsubscribe(program_address)
        logger.info("Sentinel stopped monitoring: %s", program_address)

    def mark_resumed(self, program_address: str) -> None:
        """Mark a protocol as recently resumed — prevents immediate re-pause."""
        import time
        self._resume_cooldowns[program_address] = time.time()
        logger.info("Cooldown set for %s (%ds)", program_address, self.RESUME_COOLDOWN_SECONDS)

    def _is_in_cooldown(self, program_address: str) -> bool:
        """Check if a protocol is still in post-resume cooldown."""
        import time
        resumed_at = self._resume_cooldowns.get(program_address)
        if resumed_at is None:
            return False
        elapsed = time.time() - resumed_at
        if elapsed < self.RESUME_COOLDOWN_SECONDS:
            return True
        # Cooldown expired — remove entry
        del self._resume_cooldowns[program_address]
        return False

    async def _on_transaction(self, tx: ParsedTransaction) -> None:
        """Handle an incoming transaction from the Geyser stream.

        Creates a fresh DB session per transaction to avoid stale sessions.

        1. Match to registered protocol
        2. Evaluate against invariant rules
        3. Handle result (breach → pause/alert, pass → broadcast)
        """
        try:
            async with self.session_factory() as session:
                protocol_repo = ProtocolRepository(session)

                # Find the protocol for this transaction
                protocol = await protocol_repo.find_by_program_address(
                    tx.program_address
                )
                if not protocol:
                    logger.debug(
                        "TX for unregistered program: %s", tx.program_address
                    )
                    return

                # Skip evaluation if protocol is already paused
                if protocol.status == "paused":
                    logger.debug(
                        "Skipping TX for paused protocol: %s", protocol.name
                    )
                    return

                # Skip evaluation if protocol is in post-resume cooldown
                if self._is_in_cooldown(tx.program_address):
                    logger.debug(
                        "Skipping TX for protocol in cooldown: %s", protocol.name
                    )
                    return

                # Evaluate transaction against all invariant rules
                result = await self.evaluator.evaluate(tx, protocol.id)

                # Broadcast TX + evaluation to WebSocket clients
                ws_data = {
                    "tx_hash": tx.hash,
                    "instruction_type": tx.instruction_type,
                    "amount": tx.amount,
                    "threat_level": result.threat_level,
                    "status": result.status,
                    "timestamp": tx.timestamp.isoformat(),
                }

                if result.status == "breach":
                    if result.action == "pause":
                        # CRITICAL breach with pause action
                        await self.circuit_breaker.trigger_pause(
                            protocol_id=protocol.id,
                            program_address=protocol.program_address,
                            protocol_name=protocol.name,
                            telegram_chat_id=protocol.telegram_chat_id,
                            result=result,
                            tx_hashes=[tx.hash],
                        )

                        # Dispatch Telegram alert
                        if result.escalation_reason:
                            await self.telegram_dispatcher.dispatch_escalation_alert(
                                protocol_name=protocol.name,
                                chat_id=protocol.telegram_chat_id,
                                escalation_reason=result.escalation_reason,
                                contributing_rules=result.breached_rules,
                                action_taken="pause",
                                damage_estimate=tx.amount,
                            )
                        else:
                            primary = result.breached_rules[0] if result.breached_rules else None
                            await self.telegram_dispatcher.dispatch_incident_alert(
                                protocol_name=protocol.name,
                                chat_id=protocol.telegram_chat_id,
                                invariant_type=primary.invariant_type if primary else "UNKNOWN",
                                measured_value=primary.measured_value if primary else 0,
                                threshold=primary.threshold if primary else 0,
                                action_taken="pause",
                                damage_estimate=tx.amount,
                                tx_hashes=[tx.hash],
                            )

                        # Broadcast incident via WebSocket
                        await self.ws_manager.broadcast_to_protocol(
                            protocol.id, "incident", ws_data
                        )

                    elif result.action == "alert":
                        # Breach with alert-only action
                        primary = result.breached_rules[0] if result.breached_rules else None
                        await self.telegram_dispatcher.dispatch_incident_alert(
                            protocol_name=protocol.name,
                            chat_id=protocol.telegram_chat_id,
                            invariant_type=primary.invariant_type if primary else "UNKNOWN",
                            measured_value=primary.measured_value if primary else 0,
                            threshold=primary.threshold if primary else 0,
                            action_taken="alert",
                            damage_estimate=tx.amount,
                            tx_hashes=[tx.hash],
                        )
                        await self.ws_manager.broadcast_to_protocol(
                            protocol.id, "alert", ws_data
                        )
                else:
                    # Pass — broadcast TX + threat level
                    await self.ws_manager.broadcast_to_protocol(
                        protocol.id, "transaction", ws_data
                    )

        except Exception:
            logger.exception(
                "Error processing transaction %s for program %s",
                tx.hash,
                tx.program_address,
            )
