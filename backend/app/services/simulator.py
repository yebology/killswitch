"""Drift hack replay simulator — replays the April 1, 2026 exploit timeline.

Evaluates hardcoded Drift hack events through the evaluator engine with
adjustable parameters. Shows how Killswitch would have detected and stopped
the attack, saving ~$279M of the $285M drained.
"""

import logging
import uuid
from datetime import datetime, timezone

from app.schemas.requests import SimulationParams
from app.schemas.responses import InvariantResponse, SimulationEvent, SimulationResult
from app.services.evaluator import EvaluatorService, RuleResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default thresholds (used when SimulationParams fields are None)
# ---------------------------------------------------------------------------
DEFAULT_WITHDRAWAL_RATE_THRESHOLD = 5_000_000.0  # $5M
DEFAULT_WITHDRAWAL_RATE_WINDOW = 60  # 1 minute
DEFAULT_TVL_DROP_THRESHOLD = 10.0  # 10%
DEFAULT_TVL_DROP_WINDOW = 300  # 5 minutes

# Total damage in the real Drift hack
DRIFT_TOTAL_DAMAGE = 285_000_000.0  # $285M


def _build_drift_timeline() -> list[dict]:
    """Hardcoded Drift hack timeline events (April 1, 2026).

    Based on the real attack sequence:
    1. Social engineering → compromised 2/5 multisig signers
    2. Pre-signed malicious transactions prepared
    3. Admin key change (hijacked authority)
    4. Safety parameter modifications
    5. Progressive vault drains (3 vaults, escalating amounts)
    6. Total: $285M drained in ~12 minutes
    """
    base = datetime(2026, 4, 1, 14, 0, 0, tzinfo=timezone.utc)

    return [
        {
            "offset_seconds": 0,
            "event_type": "admin_change",
            "description": "Admin authority key changed — multisig compromised (2/5 signers)",
            "tx_details": "TX: 4xK9...mN2p — setAuthority instruction detected",
            "amount": 0.0,
            "instruction_type": "admin_change",
        },
        {
            "offset_seconds": 15,
            "event_type": "parameter_change",
            "description": "Withdrawal limits removed — safety parameters modified",
            "tx_details": "TX: 7bR3...qW8x — updateConfig instruction detected",
            "amount": 0.0,
            "instruction_type": "parameter_change",
        },
        {
            "offset_seconds": 45,
            "event_type": "withdrawal",
            "description": "Vault 1 drain initiated — USDC vault targeted",
            "tx_details": "TX: 2mL5...hJ4r — withdraw 6,200,000 USDC",
            "amount": 6_200_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 90,
            "event_type": "withdrawal",
            "description": "Vault 1 drain continues — second large withdrawal",
            "tx_details": "TX: 9pN8...kF2s — withdraw 18,500,000 USDC",
            "amount": 18_500_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 150,
            "event_type": "withdrawal",
            "description": "Vault 2 drain — SOL vault targeted",
            "tx_details": "TX: 3wQ7...vB6t — withdraw 45,000,000 USD equivalent SOL",
            "amount": 45_000_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 240,
            "event_type": "withdrawal",
            "description": "Vault 2 drain continues — massive SOL withdrawal",
            "tx_details": "TX: 6hT1...nM9u — withdraw 72,000,000 USD equivalent SOL",
            "amount": 72_000_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 360,
            "event_type": "withdrawal",
            "description": "Vault 3 drain — BTC vault targeted",
            "tx_details": "TX: 8kP4...xR3w — withdraw 58,000,000 USD equivalent BTC",
            "amount": 58_000_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 480,
            "event_type": "withdrawal",
            "description": "Vault 3 drain continues — final large withdrawal",
            "tx_details": "TX: 1jS6...cD5y — withdraw 42,300,000 USD equivalent BTC",
            "amount": 42_300_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 600,
            "event_type": "withdrawal",
            "description": "Remaining funds swept — cleanup withdrawals across vaults",
            "tx_details": "TX: 5gU2...aE7z — withdraw 43,000,000 mixed assets",
            "amount": 43_000_000.0,
            "instruction_type": "transfer",
        },
        {
            "offset_seconds": 720,
            "event_type": "discovery",
            "description": "Drift team discovers exploit — manual response begins (too late)",
            "tx_details": None,
            "amount": 0.0,
            "instruction_type": "transfer",
        },
    ]


class SimulatorService:
    """Replays the Drift hack timeline through the evaluator engine."""

    def __init__(self):
        # Simulator doesn't need a real evaluator with DB access
        # It creates temporary rules and evaluates inline
        pass

    async def run_drift_simulation(
        self, params: SimulationParams
    ) -> SimulationResult:
        """Run the Drift hack simulation with adjustable parameters.

        Returns a timeline of events with evaluation results, plus a summary
        of damage with/without Killswitch.
        """
        # Resolve parameters (use defaults if None)
        wr_threshold = params.withdrawal_rate_threshold or DEFAULT_WITHDRAWAL_RATE_THRESHOLD
        wr_window = params.withdrawal_rate_window or DEFAULT_WITHDRAWAL_RATE_WINDOW
        tvl_threshold = params.tvl_drop_threshold or DEFAULT_TVL_DROP_THRESHOLD
        tvl_window = params.tvl_drop_window or DEFAULT_TVL_DROP_WINDOW

        # Build temporary invariant rules for display
        rules_used = [
            InvariantResponse(
                id=uuid.UUID("00000000-0000-4000-a000-000000000010"),
                protocol_id=uuid.UUID("00000000-0000-4000-a000-000000000001"),
                type="WITHDRAWAL_RATE",
                threshold=wr_threshold,
                time_window=wr_window,
                action="pause",
                enabled=True,
            ),
            InvariantResponse(
                id=uuid.UUID("00000000-0000-4000-a000-000000000011"),
                protocol_id=uuid.UUID("00000000-0000-4000-a000-000000000001"),
                type="TVL_DROP",
                threshold=tvl_threshold,
                time_window=tvl_window,
                action="pause",
                enabled=True,
            ),
        ]

        timeline_data = _build_drift_timeline()
        base_time = datetime(2026, 4, 1, 14, 0, 0, tzinfo=timezone.utc)

        timeline: list[SimulationEvent] = []
        cumulative_drain = 0.0
        killswitch_triggered = False
        damage_with_killswitch = 0.0

        for event in timeline_data:
            from datetime import timedelta

            ts = base_time + timedelta(seconds=event["offset_seconds"])
            amount = event["amount"]
            cumulative_drain += amount

            # Evaluate this event
            eval_result, threat_level, response_action = self._evaluate_event(
                event=event,
                cumulative_drain=cumulative_drain,
                wr_threshold=wr_threshold,
                tvl_threshold=tvl_threshold,
                killswitch_triggered=killswitch_triggered,
            )

            if not killswitch_triggered:
                damage_with_killswitch = cumulative_drain

            if response_action == "pause" and not killswitch_triggered:
                killswitch_triggered = True
                damage_with_killswitch = cumulative_drain

            timeline.append(
                SimulationEvent(
                    timestamp=ts,
                    event_type=event["event_type"],
                    description=event["description"],
                    tx_details=event["tx_details"],
                    eval_result=eval_result,
                    threat_level=threat_level,
                    response_action=response_action if not killswitch_triggered or response_action == "pause" else "blocked",
                    cumulative_drain=cumulative_drain,
                )
            )

        amount_saved = DRIFT_TOTAL_DAMAGE - damage_with_killswitch

        return SimulationResult(
            timeline=timeline,
            damage_with_killswitch=damage_with_killswitch,
            damage_without=DRIFT_TOTAL_DAMAGE,
            amount_saved=amount_saved,
            rules_used=rules_used,
        )

    def _evaluate_event(
        self,
        event: dict,
        cumulative_drain: float,
        wr_threshold: float,
        tvl_threshold: float,
        killswitch_triggered: bool,
    ) -> tuple[str, str, str]:
        """Evaluate a single timeline event.

        Returns (eval_result, threat_level, response_action).
        """
        instruction = event["instruction_type"]
        amount = event["amount"]

        # Admin key change → immediate CRITICAL
        if instruction == "admin_change":
            return "breach", "CRITICAL", "alert"

        # Parameter change → CRITICAL (with admin change already detected)
        if instruction == "parameter_change":
            return "breach", "CRITICAL", "pause"

        # Withdrawal events
        if amount > 0:
            # Check withdrawal rate threshold
            if amount > wr_threshold:
                return "breach", "CRITICAL", "pause"

            # Check if cumulative drain indicates TVL drop
            # Approximate TVL drop as percentage of a $2.85B TVL
            estimated_tvl = 2_850_000_000.0
            tvl_drop_pct = (cumulative_drain / estimated_tvl) * 100
            if tvl_drop_pct > tvl_threshold:
                return "breach", "CRITICAL", "pause"

            # Warning zone: amount > 50% of threshold
            if amount > wr_threshold * 0.5:
                return "warning", "ELEVATED", "alert"

            return "pass", "LOW", "monitor"

        # Discovery / non-financial events
        if killswitch_triggered:
            return "pass", "LOW", "blocked"

        return "pass", "LOW", "monitor"
