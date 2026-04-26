"""Telegram alert dispatcher — formats and sends alert messages."""

import logging
from datetime import datetime, timezone

from app.clients.telegram import TelegramClient
from app.services.evaluator import RuleResult

logger = logging.getLogger(__name__)


class TelegramDispatcher:
    """Formats and dispatches Telegram alert messages for incidents."""

    def __init__(self, telegram_client: TelegramClient, default_chat_id: str):
        self.client = telegram_client
        self.default_chat_id = default_chat_id

    async def dispatch_incident_alert(
        self,
        protocol_name: str,
        chat_id: str | None,
        invariant_type: str,
        measured_value: float,
        threshold: float,
        action_taken: str,
        damage_estimate: float,
        tx_hashes: list[str],
    ) -> None:
        """Format and send an incident alert message."""
        target_chat = chat_id or self.default_chat_id
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        message = (
            f"🚨 <b>KILLSWITCH ALERT</b>\n\n"
            f"<b>Protocol:</b> {protocol_name}\n"
            f"<b>Incident Type:</b> {invariant_type}\n"
            f"<b>Measured Value:</b> {measured_value:,.2f}\n"
            f"<b>Threshold:</b> {threshold:,.2f}\n"
            f"<b>Action Taken:</b> {action_taken.upper()}\n"
            f"<b>Damage Estimate:</b> ${damage_estimate:,.2f}\n"
            f"<b>TX Hashes:</b> {', '.join(tx_hashes[:3]) if tx_hashes else 'N/A'}\n"
            f"<b>Timestamp:</b> {timestamp}\n"
        )

        try:
            await self.client.send_message(target_chat, message)
        except Exception:
            logger.exception("Failed to dispatch incident alert for %s", protocol_name)

    async def dispatch_escalation_alert(
        self,
        protocol_name: str,
        chat_id: str | None,
        escalation_reason: str,
        contributing_rules: list[RuleResult],
        action_taken: str,
        damage_estimate: float,
    ) -> None:
        """Format and send an escalation alert with contributing rule details."""
        target_chat = chat_id or self.default_chat_id
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        rules_text = "\n".join(
            f"  • {r.invariant_type}: {r.measured_value:,.2f} / {r.threshold:,.2f} ({r.status})"
            for r in contributing_rules
        )

        message = (
            f"🔴 <b>KILLSWITCH ESCALATION</b>\n\n"
            f"<b>Protocol:</b> {protocol_name}\n"
            f"<b>Escalation Reason:</b> {escalation_reason}\n"
            f"<b>Contributing Rules:</b>\n{rules_text}\n"
            f"<b>Action Taken:</b> {action_taken.upper()}\n"
            f"<b>Damage Estimate:</b> ${damage_estimate:,.2f}\n"
            f"<b>Timestamp:</b> {timestamp}\n"
        )

        try:
            await self.client.send_message(target_chat, message)
        except Exception:
            logger.exception(
                "Failed to dispatch escalation alert for %s", protocol_name
            )

    async def dispatch_emergency_alert(
        self,
        protocol_name: str,
        chat_id: str | None,
        message: str,
    ) -> None:
        """Send an emergency alert (e.g., circuit breaker TX failure)."""
        target_chat = chat_id or self.default_chat_id
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        alert = (
            f"⚠️ <b>EMERGENCY ALERT</b>\n\n"
            f"<b>Protocol:</b> {protocol_name}\n"
            f"<b>Message:</b> {message}\n"
            f"<b>Timestamp:</b> {timestamp}\n"
        )

        try:
            await self.client.send_message(target_chat, alert)
        except Exception:
            logger.exception(
                "Failed to dispatch emergency alert for %s", protocol_name
            )
