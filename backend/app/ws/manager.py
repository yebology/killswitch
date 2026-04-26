"""WebSocket connection manager — per-protocol client management."""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class WebSocketManager:
    """Manages WebSocket connections grouped by protocol ID.

    Thread-safe via asyncio.Lock. Handles disconnected clients
    gracefully by removing them on send failure.
    """

    connections: dict[UUID, set[WebSocket]] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def connect(self, protocol_id: UUID, websocket: WebSocket) -> None:
        """Accept and register a WebSocket connection for a protocol."""
        await websocket.accept()
        async with self._lock:
            if protocol_id not in self.connections:
                self.connections[protocol_id] = set()
            self.connections[protocol_id].add(websocket)
        logger.debug(
            "WebSocket connected for protocol %s (total: %d)",
            protocol_id,
            len(self.connections.get(protocol_id, set())),
        )

    async def disconnect(self, protocol_id: UUID, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from a protocol's subscription."""
        async with self._lock:
            if protocol_id in self.connections:
                self.connections[protocol_id].discard(websocket)
                if not self.connections[protocol_id]:
                    del self.connections[protocol_id]
        logger.debug("WebSocket disconnected for protocol %s", protocol_id)

    async def broadcast_to_protocol(
        self, protocol_id: UUID, msg_type: str, data: dict
    ) -> None:
        """Broadcast a JSON message to all clients subscribed to a protocol."""
        message = json.dumps({"type": msg_type, "data": data})

        async with self._lock:
            clients = self.connections.get(protocol_id, set()).copy()

        disconnected: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_text(message)
            except Exception:
                disconnected.append(client)

        # Clean up disconnected clients
        for client in disconnected:
            await self.disconnect(protocol_id, client)

    @property
    def total_connections(self) -> int:
        """Total number of active WebSocket connections across all protocols."""
        return sum(len(clients) for clients in self.connections.values())
