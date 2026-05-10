"""Evaluator service — invariant evaluation engine with severity escalation.

Uses a strategy pattern to evaluate transactions against different invariant
types. Calculates combined threat level via multi-signal correlation.
"""

import logging
from dataclasses import dataclass, field
from typing import Awaitable, Callable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.clients.geyser import ParsedTransaction
from app.constants import (
    THREAT_LEVEL_CRITICAL,
    THREAT_LEVEL_ELEVATED,
    THREAT_LEVEL_HIGH,
    THREAT_LEVEL_LOW,
)
from app.models.invariant import Invariant
from app.repositories.invariant import InvariantRepository

logger = logging.getLogger(__name__)


@dataclass
class RuleResult:
    """Result of evaluating a single invariant rule against a transaction."""

    invariant_id: UUID
    invariant_type: str
    status: str  # "pass", "warning", "breach"
    measured_value: float
    threshold: float


@dataclass
class EvaluationResult:
    """Combined result of evaluating all invariant rules for a protocol."""

    status: str  # "pass", "breach"
    threat_level: str  # "LOW", "ELEVATED", "HIGH", "CRITICAL"
    rule_results: list[RuleResult] = field(default_factory=list)
    breached_rules: list[RuleResult] = field(default_factory=list)
    escalation_reason: str | None = None
    action: str = ""  # "pause", "alert", or "" (no action)


# Type alias for evaluation strategy functions
EvaluationStrategy = Callable[
    [ParsedTransaction, Invariant], Awaitable[RuleResult]
]


class EvaluatorService:
    """Evaluates transactions against invariant rules with severity escalation.

    Strategy pattern maps each invariant type to an async evaluation function.
    After evaluating all rules, calculates combined threat level and determines
    whether to escalate.

    Uses session_factory to create fresh DB sessions per evaluation call.
    """

    # Warning threshold: measured value > 50% of configured threshold
    WARNING_RATIO = 0.5

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory
        self.strategies: dict[str, EvaluationStrategy] = {
            "WITHDRAWAL_RATE": self._eval_withdrawal_rate,
            "TVL_DROP": self._eval_tvl_drop,
            "ADMIN_ACTION": self._eval_admin_action,
        }

    async def evaluate(
        self, tx: ParsedTransaction, protocol_id: UUID
    ) -> EvaluationResult:
        """Evaluate a transaction against all enabled invariant rules.

        Creates a fresh session to fetch invariants, then evaluates.
        Returns an EvaluationResult with combined threat level and action.
        """
        async with self.session_factory() as session:
            invariant_repo = InvariantRepository(session)
            invariants = await invariant_repo.find_enabled_by_protocol_id(protocol_id)

        if not invariants:
            return EvaluationResult(
                status="pass", threat_level=THREAT_LEVEL_LOW
            )

        rule_results: list[RuleResult] = []
        for inv in invariants:
            strategy = self.strategies.get(inv.type)
            if strategy:
                result = await strategy(tx, inv)
                rule_results.append(result)

        return self._calculate_threat_level(rule_results)

    def evaluate_from_results(
        self, rule_results: list[RuleResult]
    ) -> EvaluationResult:
        """Calculate threat level from pre-computed rule results.

        Used by the simulator to evaluate without DB access.
        """
        return self._calculate_threat_level(rule_results)

    def _calculate_threat_level(
        self, rule_results: list[RuleResult]
    ) -> EvaluationResult:
        """Calculate combined threat level from individual rule results.

        Severity escalation logic:
        - 0 warnings → LOW
        - 1 warning → ELEVATED
        - 2+ warnings → HIGH → auto-escalate to CRITICAL
        - Any single breach → CRITICAL
        - Admin/Parameter change + any warning → CRITICAL
        """
        breached = [r for r in rule_results if r.status == "breach"]
        warnings = [r for r in rule_results if r.status == "warning"]
        warning_count = len(warnings)

        # Check for admin/parameter change signals
        has_admin_signal = any(
            r.invariant_type in ("ADMIN_ACTION",)
            and r.status in ("breach", "warning")
            for r in rule_results
        )

        # Direct breach → CRITICAL
        if breached:
            # Determine action from the highest-priority breached rule
            action = self._determine_action(breached)
            return EvaluationResult(
                status="breach",
                threat_level=THREAT_LEVEL_CRITICAL,
                rule_results=rule_results,
                breached_rules=breached,
                escalation_reason=None,
                action=action,
            )

        # Admin/parameter change + any other warning → CRITICAL escalation
        if has_admin_signal and warning_count >= 1:
            admin_rules = [
                r
                for r in rule_results
                if r.invariant_type in ("ADMIN_ACTION",)
                and r.status in ("breach", "warning")
            ]
            other_warnings = [r for r in warnings if r not in admin_rules]
            contributing = admin_rules + other_warnings
            reason = (
                f"ESCALATION: Admin/parameter change detected with "
                f"{len(other_warnings)} additional warning(s). "
                f"Contributing rules: {[str(r.invariant_id) for r in contributing]}"
            )
            return EvaluationResult(
                status="breach",
                threat_level=THREAT_LEVEL_CRITICAL,
                rule_results=rule_results,
                breached_rules=contributing,
                escalation_reason=reason,
                action="pause",
            )

        # 2+ warnings → HIGH → auto-escalate to CRITICAL
        if warning_count >= 2:
            reason = (
                f"ESCALATION: {warning_count} simultaneous warnings detected. "
                f"Contributing rules: {[str(r.invariant_id) for r in warnings]}"
            )
            return EvaluationResult(
                status="breach",
                threat_level=THREAT_LEVEL_CRITICAL,
                rule_results=rule_results,
                breached_rules=warnings,
                escalation_reason=reason,
                action="pause",
            )

        # 1 warning → ELEVATED
        if warning_count == 1:
            return EvaluationResult(
                status="pass",
                threat_level=THREAT_LEVEL_ELEVATED,
                rule_results=rule_results,
            )

        # 0 warnings → LOW
        return EvaluationResult(
            status="pass",
            threat_level=THREAT_LEVEL_LOW,
            rule_results=rule_results,
        )

    def _determine_action(self, breached_rules: list[RuleResult]) -> str:
        """Determine the action to take based on breached rules.

        If any breached rule's invariant has action "pause", return "pause".
        Otherwise return "alert".
        """
        # For now, default to "pause" for any breach
        return "pause"

    # -----------------------------------------------------------------------
    # Evaluation strategies per invariant type
    # -----------------------------------------------------------------------

    async def _eval_withdrawal_rate(
        self, tx: ParsedTransaction, inv: Invariant
    ) -> RuleResult:
        """Evaluate WITHDRAWAL_RATE: compare TX amount against threshold.

        In production, this would sum withdrawals within the time window.
        For MVP, we evaluate the single transaction amount as a proxy.
        """
        measured = tx.amount if tx.instruction_type == "transfer" else 0.0
        status = self._classify(measured, inv.threshold)
        return RuleResult(
            invariant_id=inv.id,
            invariant_type=inv.type,
            status=status,
            measured_value=measured,
            threshold=inv.threshold,
        )

    async def _eval_tvl_drop(
        self, tx: ParsedTransaction, inv: Invariant
    ) -> RuleResult:
        """Evaluate TVL_DROP: estimate TVL impact from transaction.

        Converts the withdrawal amount to a percentage of estimated protocol TVL.
        Threshold is in percentage (e.g., 10 = 10% drop).
        For MVP, we assume a baseline TVL of $50M per protocol.
        """
        # Estimated protocol TVL (in production, this would be fetched from on-chain)
        ESTIMATED_TVL = 50_000_000.0  # $50M baseline

        if tx.instruction_type == "transfer" and tx.amount > 0:
            # Convert amount to percentage of TVL
            measured_pct = (tx.amount / ESTIMATED_TVL) * 100.0
        else:
            measured_pct = 0.0

        status = self._classify(measured_pct, inv.threshold)
        return RuleResult(
            invariant_id=inv.id,
            invariant_type=inv.type,
            status=status,
            measured_value=measured_pct,
            threshold=inv.threshold,
        )

    async def _eval_admin_action(
        self, tx: ParsedTransaction, inv: Invariant
    ) -> RuleResult:
        """Evaluate ADMIN_ACTION: detect any admin activity (key change, parameter modification, config update)."""
        is_admin_action = tx.instruction_type in (
            "admin_change",
            "authority_change",
            "parameter_change",
            "config_update",
        )
        measured = 1.0 if is_admin_action else 0.0
        status = "breach" if is_admin_action else "pass"
        return RuleResult(
            invariant_id=inv.id,
            invariant_type=inv.type,
            status=status,
            measured_value=measured,
            threshold=inv.threshold,
        )

    def _classify(self, measured: float, threshold: float) -> str:
        """Classify a measured value against a threshold.

        - breach: measured > threshold
        - warning: measured > 50% of threshold
        - pass: otherwise
        """
        if measured > threshold:
            return "breach"
        if measured > threshold * self.WARNING_RATIO:
            return "warning"
        return "pass"
