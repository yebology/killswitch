"""Pydantic response schemas for API serialization."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class InvariantResponse(BaseModel):
    """Serialized invariant rule."""

    id: UUID
    protocol_id: UUID
    type: str
    threshold: float
    time_window: int
    action: str
    enabled: bool

    model_config = {"from_attributes": True}


class ProtocolResponse(BaseModel):
    """Serialized protocol with nested invariants."""

    id: UUID
    program_address: str
    name: str
    guardian_wallet: str
    telegram_chat_id: str | None
    status: str
    created_at: datetime
    invariants: list[InvariantResponse] = []

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Response for wallet verification."""

    wallet_address: str
    is_guardian: bool


class SimulationEvent(BaseModel):
    """Single event in the Drift hack simulation timeline."""

    timestamp: datetime
    event_type: str
    description: str
    tx_details: str | None = None
    eval_result: str  # "pass", "warning", "breach"
    threat_level: str  # "LOW", "ELEVATED", "HIGH", "CRITICAL"
    response_action: str  # "monitor", "alert", "pause"
    cumulative_drain: float


class SimulationResult(BaseModel):
    """Full result of a Drift hack simulation run."""

    timeline: list[SimulationEvent]
    damage_with_killswitch: float
    damage_without: float  # $285M
    amount_saved: float
    rules_used: list[InvariantResponse]


class APIResponse(BaseModel):
    """Standard API response envelope."""

    status: str  # "success" or "error"
    message: str
    data: Any = None
