"""Pydantic request schemas for API validation."""

from typing import Literal

from pydantic import BaseModel, Field


class RegisterProtocolRequest(BaseModel):
    """Body for POST /api/protocols."""

    program_address: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    telegram_chat_id: str | None = None


class CreateInvariantRequest(BaseModel):
    """Body for POST /api/protocols/{id}/invariants."""

    type: Literal[
        "WITHDRAWAL_RATE",
        "TVL_DROP",
        "ADMIN_ACTION",
    ]
    threshold: float = Field(..., gt=0)
    time_window: int = Field(..., gt=0)
    action: Literal["pause", "alert"]


class VerifyWalletRequest(BaseModel):
    """Body for POST /api/auth/verify."""

    wallet_address: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    signature: str = Field(..., min_length=1)  # Base58-encoded ed25519 signature


class SimulationParams(BaseModel):
    """Query parameters for GET /api/simulate/drift."""

    withdrawal_rate_threshold: float | None = None  # Default: 5_000_000 ($5M)
    withdrawal_rate_window: int | None = None  # Default: 60 (1 minute)
    tvl_drop_threshold: float | None = None  # Default: 10.0 (10%)
    tvl_drop_window: int | None = None  # Default: 300 (5 minutes)
