"""Killswitch Sentinel Service — FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.middleware import setup_middleware
from app.api.routes import api_router
from app.clients.geyser import GeyserClient
from app.clients.solana import SolanaClient
from app.clients.telegram import TelegramClient
from app.core.config import Settings
from app.core.database import Base, init_db
from app.services.circuit_breaker import CircuitBreakerService
from app.services.evaluator import EvaluatorService
from app.services.sentinel import SentinelService
from app.services.telegram import TelegramDispatcher
from app.ws.routes import router as ws_router, ws_manager

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global sentinel reference (started/stopped in lifespan)
# ---------------------------------------------------------------------------
_sentinel: SentinelService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    global _sentinel

    settings = Settings()

    # Initialize database
    init_db(settings.database_url)
    logger.info("Database initialized: %s", settings.db_host)

    # Create tables (hackathon shortcut — no Alembic in dev)
    from app.core.database import engine as _engine
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    # Initialize external clients
    geyser_client = GeyserClient(
        ws_url=settings.solana_ws_url,
        mock_mode=True,  # Use mock mode for demo
    )
    solana_client = SolanaClient(
        rpc_url=settings.solana_rpc_url,
        guardian_program_id=settings.guardian_program_id,
        keypair_json=settings.sentinel_keypair,
    )
    telegram_client = TelegramClient(bot_token=settings.telegram_bot_token)

    # Initialize services — pass session_factory so Sentinel creates fresh
    # sessions per-transaction (avoids stale/closed session issues)
    from app.core.database import async_session_factory

    evaluator = EvaluatorService(session_factory=async_session_factory)
    telegram_dispatcher = TelegramDispatcher(
        telegram_client=telegram_client,
        default_chat_id=settings.telegram_chat_id,
    )
    circuit_breaker = CircuitBreakerService(
        solana_client=solana_client,
        session_factory=async_session_factory,
        telegram_dispatcher=telegram_dispatcher,
    )

    _sentinel = SentinelService(
        geyser_client=geyser_client,
        evaluator=evaluator,
        circuit_breaker=circuit_breaker,
        telegram_dispatcher=telegram_dispatcher,
        ws_manager=ws_manager,
        session_factory=async_session_factory,
    )

    # Start sentinel monitoring
    await _sentinel.start()
    logger.info("Sentinel service started")

    # Set sentinel reference for internal inject endpoint (demo)
    from app.api.routes.internal import set_sentinel_ref
    set_sentinel_ref(_sentinel)

    yield

    # Shutdown
    if _sentinel:
        await _sentinel.stop()
        logger.info("Sentinel service stopped")

    from app.core.database import engine as _eng
    if _eng:
        await _eng.dispose()
        logger.info("Database engine disposed")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Killswitch Sentinel Service",
    description="Real-time exploit detection and auto-pause system for Solana DeFi protocols",
    version="0.1.0",
    lifespan=lifespan,
)

# Setup middleware (CORS + exception handlers)
settings = Settings()
setup_middleware(app, settings)

# Include API routes
app.include_router(api_router)

# Include WebSocket routes
app.include_router(ws_router)

# ---------------------------------------------------------------------------
# Uvicorn runner (for direct execution)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.app_port,
        reload=True,
    )
