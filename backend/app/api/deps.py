"""FastAPI dependencies — dependency injection for routes.

Provides database sessions, authenticated wallet extraction,
and service factory functions via FastAPI's Depends() system.
"""

import logging
from collections.abc import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.solana import SolanaClient
from app.clients.telegram import TelegramClient
from app.core.config import Settings
from app.core.database import get_session
from app.repositories.incident import IncidentRepository
from app.repositories.invariant import InvariantRepository
from app.repositories.protocol import ProtocolRepository
from app.services.circuit_breaker import CircuitBreakerService
from app.services.evaluator import EvaluatorService
from app.services.incident import IncidentService
from app.services.invariant import InvariantService
from app.services.protocol import ProtocolService
from app.services.simulator import SimulatorService
from app.services.telegram import TelegramDispatcher

logger = logging.getLogger(__name__)

# Singleton settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the application settings singleton."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async for session in get_session():
        yield session


async def get_current_wallet(
    x_wallet_address: str = Header(None, alias="X-Wallet-Address"),
) -> str:
    """Extract and validate the wallet address from request headers.

    Raises 401 if the wallet header is missing or empty.
    """
    if not x_wallet_address or not x_wallet_address.strip():
        raise HTTPException(status_code=401, detail="Unauthorized: wallet address required")
    return x_wallet_address.strip()


# ---------------------------------------------------------------------------
# Service factory dependencies
# ---------------------------------------------------------------------------


def get_protocol_service(
    session: AsyncSession = Depends(get_db_session),
) -> ProtocolService:
    """Create a ProtocolService with injected dependencies."""
    protocol_repo = ProtocolRepository(session)
    settings = get_settings()
    solana_client = SolanaClient(
        rpc_url=settings.solana_rpc_url,
        guardian_program_id=settings.guardian_program_id,
        keypair_json=settings.sentinel_keypair,
    )
    return ProtocolService(
        protocol_repo=protocol_repo,
        solana_client=solana_client,
    )


def get_invariant_service(
    session: AsyncSession = Depends(get_db_session),
) -> InvariantService:
    """Create an InvariantService with injected dependencies."""
    invariant_repo = InvariantRepository(session)
    protocol_repo = ProtocolRepository(session)
    return InvariantService(
        invariant_repo=invariant_repo,
        protocol_repo=protocol_repo,
    )


def get_incident_service(
    session: AsyncSession = Depends(get_db_session),
) -> IncidentService:
    """Create an IncidentService with injected dependencies."""
    incident_repo = IncidentRepository(session)
    return IncidentService(incident_repo=incident_repo)


def get_evaluator_service(
    session: AsyncSession = Depends(get_db_session),
) -> EvaluatorService:
    """Create an EvaluatorService with injected dependencies."""
    invariant_repo = InvariantRepository(session)
    return EvaluatorService(invariant_repo=invariant_repo)


def get_simulator_service() -> SimulatorService:
    """Create a SimulatorService (no DB dependencies)."""
    return SimulatorService()
