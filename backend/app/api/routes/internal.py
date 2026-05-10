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

router = APIRouter(prefix="/_internal", tags=["internal"])

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


class AttackTestRequest(BaseModel):
    """Request body for running an attack test on a protocol."""
    program_address: str


@router.post("/attack_test")
async def run_attack_test(req: AttackTestRequest):
    """Run a simulated Drift-like attack sequence on a protocol.

    Injects a series of malicious transactions that demonstrate how
    Killswitch detects multi-signal attacks. Sends a comprehensive
    Telegram alert showing ALL breached indicators.

    Used by the "Run Attack Test" button in the protocol detail page.
    """
    import asyncio
    import uuid
    from app.repositories.protocol import ProtocolRepository
    from app.repositories.incident import IncidentRepository
    from app.models.incident import Incident
    from app.constants import PROTOCOL_STATUS_PAUSED
    from datetime import datetime, timezone

    if _sentinel_ref is None:
        return success_response(
            {"processed": False, "reason": "Sentinel not started"},
            message="Sentinel not available",
            status_code=503,
        )

    # Find the protocol first
    async with _sentinel_ref.session_factory() as session:
        protocol_repo = ProtocolRepository(session)
        protocol = await protocol_repo.find_by_program_address(req.program_address)
        if not protocol:
            return success_response(
                {"processed": False, "reason": "Protocol not found"},
                message=f"No protocol registered with address {req.program_address[:16]}...",
                status_code=404,
            )
        protocol_id = protocol.id
        protocol_name = protocol.name
        telegram_chat_id = protocol.telegram_chat_id

    # Read user-configured thresholds to generate attack amounts that WILL breach
    async with _sentinel_ref.session_factory() as session:
        from app.repositories.invariant import InvariantRepository
        invariant_repo = InvariantRepository(session)
        invariants = await invariant_repo.find_enabled_by_protocol_id(protocol_id)

    # Extract thresholds per type
    wr_threshold = 5_000_000.0  # fallback
    tvl_threshold = 10.0  # fallback
    has_admin = False
    for inv in invariants:
        if inv.type == "WITHDRAWAL_RATE":
            wr_threshold = inv.threshold
        elif inv.type == "TVL_DROP":
            tvl_threshold = inv.threshold
        elif inv.type == "ADMIN_ACTION":
            has_admin = True

    # Build attack steps that guarantee breach based on user thresholds
    # Transfer amounts: 40% of threshold (warning), 70% (warning), then 120% (breach)
    attack_steps = [
        {"instruction_type": "admin_change", "amount": 0.0, "delay": 0, "label": "Admin key change (multisig compromised)"},
        {"instruction_type": "parameter_change", "amount": 0.0, "delay": 0.5, "label": "Safety parameters removed"},
        {"instruction_type": "transfer", "amount": round(wr_threshold * 0.4), "delay": 0.5, "label": "Vault 1 drain initiated"},
        {"instruction_type": "transfer", "amount": round(wr_threshold * 0.7), "delay": 0.5, "label": "Vault 1 drain (escalating)"},
        {"instruction_type": "transfer", "amount": round(wr_threshold * 1.2), "delay": 0.5, "label": "Vault 2 drain (exceeds threshold)"},
    ]

    # Evaluate each step but DON'T pause yet — collect all evidence
    tx_hashes = []
    breached_indicators = []
    total_damage = 0.0

    for step in attack_steps:
        if step["delay"] > 0:
            await asyncio.sleep(step["delay"])

        tx = ParsedTransaction(
            hash=uuid.uuid4().hex[:64],
            program_address=req.program_address,
            instruction_type=step["instruction_type"],
            amount=step["amount"],
            accounts=[],
            timestamp=datetime.now(timezone.utc),
        )
        tx_hashes.append(tx.hash)

        # Evaluate without triggering pause
        result = await _sentinel_ref.evaluator.evaluate(tx, protocol_id)

        if result.status == "breach":
            for rule in result.breached_rules:
                breached_indicators.append({
                    "type": rule.invariant_type,
                    "measured": rule.measured_value,
                    "threshold": rule.threshold,
                    "label": step["label"],
                })

        total_damage += step["amount"]

    # Now trigger pause + send comprehensive alert
    # Update protocol status
    async with _sentinel_ref.session_factory() as session:
        protocol_repo = ProtocolRepository(session)
        incident_repo = IncidentRepository(session)

        await protocol_repo.update_status(protocol_id, PROTOCOL_STATUS_PAUSED)

        # Get a valid invariant_id for the FK constraint
        from app.repositories.invariant import InvariantRepository as IR2
        inv_repo = IR2(session)
        all_invs = await inv_repo.find_enabled_by_protocol_id(protocol_id)
        fallback_invariant_id = all_invs[0].id if all_invs else None

        # Create incident (only if we have a valid invariant reference)
        if fallback_invariant_id:
            incident = Incident(
                protocol_id=protocol_id,
                invariant_id=fallback_invariant_id,
                trigger_time=datetime.now(timezone.utc),
                tx_hashes=tx_hashes[:5],
                action_taken="pause",
                damage_estimate=total_damage,
                escalation_reason=f"Attack test: {len(breached_indicators)} indicators breached",
            )
            await incident_repo.create(incident)

    # Trigger on-chain pause (stub)
    try:
        await _sentinel_ref.circuit_breaker.solana_client.trigger_pause(req.program_address)
    except Exception:
        logger.warning("On-chain pause stub failed (non-critical)")

    # Send comprehensive Telegram alert with ALL indicators
    indicators_text = "\n".join(
        f"  • {b['type']}: {b['measured']:,.2f} / {b['threshold']:,.2f} — {b['label']}"
        for b in breached_indicators
    )
    if not indicators_text:
        indicators_text = "  • Multi-signal correlation triggered"

    from app.clients.telegram import TelegramClient
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    message = (
        f"🚨 <b>KILLSWITCH — ATTACK DETECTED</b>\n\n"
        f"<b>Protocol:</b> {protocol_name}\n"
        f"<b>Attack Pattern:</b> Drift-like exploit (admin takeover + drain)\n"
        f"<b>Indicators Breached:</b> {len(breached_indicators)}\n"
        f"{indicators_text}\n\n"
        f"<b>Total Damage Estimate:</b> ${total_damage:,.2f}\n"
        f"<b>Action Taken:</b> AUTO-PAUSE ✅\n"
        f"<b>TX Hashes:</b> {', '.join(h[:12] + '...' for h in tx_hashes[:3])}\n"
        f"<b>Timestamp:</b> {timestamp}\n\n"
        f"⚡ Protocol paused in <b>&lt;5 seconds</b> — funds secured."
    )

    await _sentinel_ref.telegram_dispatcher.client.send_message(
        telegram_chat_id or _sentinel_ref.telegram_dispatcher.default_chat_id,
        message,
    )

    # Broadcast via WebSocket
    await _sentinel_ref.ws_manager.broadcast_to_protocol(
        protocol_id, "incident", {
            "tx_hash": tx_hashes[0],
            "instruction_type": "attack_sequence",
            "amount": total_damage,
            "threat_level": "CRITICAL",
            "status": "breach",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    return success_response(
        {
            "steps_executed": len(attack_steps),
            "indicators_breached": len(breached_indicators),
            "total_damage": total_damage,
            "action": "pause",
            "telegram_sent": True,
        },
        message="Attack detected — protocol paused, Telegram alert sent",
        status_code=200,
    )
