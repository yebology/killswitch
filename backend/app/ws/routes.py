"""WebSocket route handler — real-time TX feed and evaluation updates."""

import logging
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.ws.manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton WebSocket manager (shared across the application)
ws_manager = WebSocketManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    protocol_id: UUID = Query(...),
):
    """WebSocket endpoint for real-time protocol monitoring.

    ws://host/ws?protocol_id=<UUID>

    Clients receive JSON messages with types:
    - "transaction": new TX evaluated
    - "incident": breach detected
    - "status_change": protocol status updated
    - "threat_level": threat level changed
    """
    await ws_manager.connect(protocol_id, websocket)
    logger.info("WebSocket client connected for protocol %s", protocol_id)

    try:
        # Keep-alive loop — wait for client messages or disconnect
        while True:
            # We don't expect client messages, but we need to keep
            # the connection alive and detect disconnects
            data = await websocket.receive_text()
            # Client can send "ping" for keep-alive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected for protocol %s", protocol_id)
    except Exception:
        logger.exception("WebSocket error for protocol %s", protocol_id)
    finally:
        await ws_manager.disconnect(protocol_id, websocket)
