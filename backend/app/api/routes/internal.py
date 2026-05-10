"""Internal routes for demo/testing — inject simulated transactions.

These endpoints are NOT for production use. They allow the attack simulator
script to feed fake transactions into the Sentinel for live demo purposes.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.response import success_response
from app.clients.geyser import ParsedTransaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/_internal", tags=["internal"])

# Reference to the sentinel service (set during app startup)
_sentinel_ref = None


def set_sentinel_ref(sentinel) -> None:
    """Set the sentinel reference for transaction injection."""
    global _sentinel_ref
    _sentinel_ref = sentinel


class InjectTxRequest(BaseModel):
    """Request body for injecting a simulated transaction."""
    hash: str
    program_address: str
    instruction_type: str
    amount: float


@router.post("/inject_tx")
async def inject_transaction(req: InjectTxRequest):
    """Inject a simulated transaction into the Sentinel for processing.

    This triggers the full evaluation pipeline: evaluate → escalate →
    circuit breaker → telegram alert → WebSocket broadcast.

    Used by the attack simulator script for live demos.
    """
    if _sentinel_ref is None:
        return success_response(
            {"processed": False, "reason": "Sentinel not started"},
            message="Sentinel not available",
            status_code=503,
        )

    # Create a ParsedTransaction from the request
    tx = ParsedTransaction(
        hash=req.hash,
        program_address=req.program_address,
        instruction_type=req.instruction_type,
        amount=req.amount,
        accounts=[],
        timestamp=datetime.now(timezone.utc),
    )

    logger.info(
        "Injecting simulated TX: hash=%s, type=%s, amount=%.0f, program=%s",
        tx.hash[:16],
        tx.instruction_type,
        tx.amount,
        tx.program_address[:16],
    )

    # Process through the sentinel pipeline
    await _sentinel_ref._on_transaction(tx)

    return success_response(
        {"processed": True, "hash": tx.hash, "instruction_type": tx.instruction_type},
        message="Transaction injected and processed",
        status_code=200,
    )
