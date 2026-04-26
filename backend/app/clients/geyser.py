"""Geyser/WebSocket transaction stream client for Solana.

Subscribes to real-time transaction streams per program address.
Includes a mock mode for demo/development that generates fake transactions.
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)


@dataclass
class ParsedTransaction:
    """Internal representation of a parsed Solana transaction."""

    hash: str
    program_address: str
    instruction_type: str  # "transfer", "admin_change", "parameter_change", etc.
    amount: float
    accounts: list[str]
    timestamp: datetime


class GeyserClient:
    """Async WebSocket client for Solana transaction streams.

    Connects to a Geyser-compatible WebSocket endpoint and streams
    parsed transactions for subscribed program addresses.
    """

    RECONNECT_DELAY: float = 5.0  # Fixed 5-second reconnect delay

    def __init__(self, ws_url: str, mock_mode: bool = False):
        self.ws_url = ws_url
        self.mock_mode = mock_mode
        self._connection = None
        self._subscriptions: set[str] = set()
        self._callback: Callable[[ParsedTransaction], Awaitable[None]] | None = None
        self._running: bool = False
        self._task: asyncio.Task | None = None

    def on_transaction(
        self, callback: Callable[[ParsedTransaction], Awaitable[None]]
    ) -> None:
        """Register a callback for incoming transactions."""
        self._callback = callback

    async def connect(self) -> None:
        """Establish WebSocket connection and start listening."""
        self._running = True
        if self.mock_mode:
            logger.info("GeyserClient running in MOCK mode")
            self._task = asyncio.create_task(self._mock_loop())
        else:
            self._task = asyncio.create_task(self._listen_loop())

    async def subscribe(self, program_address: str) -> None:
        """Subscribe to transactions for a program address."""
        self._subscriptions.add(program_address)
        logger.info("Subscribed to program: %s", program_address)
        if self._connection and not self.mock_mode:
            await self._send_subscribe(program_address)

    async def unsubscribe(self, program_address: str) -> None:
        """Unsubscribe from a program address."""
        self._subscriptions.discard(program_address)
        logger.info("Unsubscribed from program: %s", program_address)
        if self._connection and not self.mock_mode:
            await self._send_unsubscribe(program_address)

    async def close(self) -> None:
        """Stop listening and close the connection."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        if self._connection:
            await self._connection.close()
            self._connection = None
        logger.info("GeyserClient closed")

    async def _listen_loop(self) -> None:
        """Main loop: connect, listen, reconnect on failure."""
        import websockets

        while self._running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    self._connection = ws
                    logger.info("Connected to Geyser WebSocket: %s", self.ws_url)

                    # Re-subscribe to all tracked programs
                    for addr in self._subscriptions:
                        await self._send_subscribe(addr)

                    async for raw_message in ws:
                        if not self._running:
                            break
                        try:
                            tx = self._parse_message(raw_message)
                            if tx and self._callback:
                                await self._callback(tx)
                        except Exception:
                            logger.exception("Error processing transaction message")

            except asyncio.CancelledError:
                break
            except Exception:
                logger.warning(
                    "Geyser connection lost, reconnecting in %.0fs...",
                    self.RECONNECT_DELAY,
                )
                self._connection = None
                await asyncio.sleep(self.RECONNECT_DELAY)

    async def _mock_loop(self) -> None:
        """Generate fake transactions for demo/development."""
        import random
        import uuid

        instruction_types = [
            "transfer",
            "transfer",
            "transfer",
            "transfer",
            "admin_change",
            "parameter_change",
        ]

        while self._running:
            try:
                await asyncio.sleep(3)  # Emit a fake TX every 3 seconds
                if not self._subscriptions or not self._callback:
                    continue

                program = random.choice(list(self._subscriptions))
                tx = ParsedTransaction(
                    hash=uuid.uuid4().hex[:64],
                    program_address=program,
                    instruction_type=random.choice(instruction_types),
                    amount=random.uniform(100, 2_000_000),
                    accounts=[
                        uuid.uuid4().hex[:44],
                        uuid.uuid4().hex[:44],
                    ],
                    timestamp=datetime.now(timezone.utc),
                )
                logger.debug("Mock TX: %s %.2f", tx.instruction_type, tx.amount)
                await self._callback(tx)

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Error in mock loop")

    async def _send_subscribe(self, program_address: str) -> None:
        """Send subscription message over WebSocket."""
        if self._connection:
            msg = json.dumps(
                {"method": "subscribe", "params": {"program": program_address}}
            )
            await self._connection.send(msg)

    async def _send_unsubscribe(self, program_address: str) -> None:
        """Send unsubscribe message over WebSocket."""
        if self._connection:
            msg = json.dumps(
                {"method": "unsubscribe", "params": {"program": program_address}}
            )
            await self._connection.send(msg)

    def _parse_message(self, raw: str) -> ParsedTransaction | None:
        """Parse a raw WebSocket message into a ParsedTransaction."""
        try:
            data = json.loads(raw)
            tx_data = data.get("transaction") or data.get("result", {})
            if not tx_data:
                return None

            return ParsedTransaction(
                hash=tx_data.get("signature", ""),
                program_address=tx_data.get("programId", ""),
                instruction_type=tx_data.get("type", "unknown"),
                amount=float(tx_data.get("amount", 0)),
                accounts=tx_data.get("accounts", []),
                timestamp=datetime.now(timezone.utc),
            )
        except (json.JSONDecodeError, KeyError, ValueError):
            logger.warning("Failed to parse transaction message")
            return None
