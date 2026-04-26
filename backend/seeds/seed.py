"""Seed sample data for development and demo.

Run with: python -m seeds.seed
"""

import asyncio
import uuid

from app.core.config import Settings
from app.core.database import Base, init_db, engine, async_session_factory
from app.models.invariant import Invariant
from app.models.protocol import Protocol


# Fixed UUIDs for reproducible seed data
SAMPLE_PROTOCOL_ID = uuid.UUID("00000000-0000-4000-a000-000000000001")
SAMPLE_INVARIANT_WR_ID = uuid.UUID("00000000-0000-4000-a000-000000000010")
SAMPLE_INVARIANT_TVL_ID = uuid.UUID("00000000-0000-4000-a000-000000000011")


async def seed() -> None:
    """Populate the database with sample Protocol and Invariant records."""
    settings = Settings()
    init_db(settings.database_url)

    # Create tables (hackathon shortcut — no Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # Check if sample protocol already exists
        existing = await session.get(Protocol, SAMPLE_PROTOCOL_ID)
        if existing:
            print("Seed data already exists — skipping.")
            return

        # Sample Protocol (Drift-like)
        protocol = Protocol(
            id=SAMPLE_PROTOCOL_ID,
            program_address="dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH",
            name="Drift Protocol",
            guardian_wallet="GuardWaLLet1111111111111111111111111111111111",
            telegram_chat_id="-1001234567890",
            status="active",
        )
        session.add(protocol)

        # Sample Invariant — WITHDRAWAL_RATE ($5M per minute)
        inv_wr = Invariant(
            id=SAMPLE_INVARIANT_WR_ID,
            protocol_id=SAMPLE_PROTOCOL_ID,
            type="WITHDRAWAL_RATE",
            threshold=5_000_000.0,
            time_window=60,
            action="pause",
            enabled=True,
        )
        session.add(inv_wr)

        # Sample Invariant — TVL_DROP (10% in 5 minutes)
        inv_tvl = Invariant(
            id=SAMPLE_INVARIANT_TVL_ID,
            protocol_id=SAMPLE_PROTOCOL_ID,
            type="TVL_DROP",
            threshold=10.0,
            time_window=300,
            action="pause",
            enabled=True,
        )
        session.add(inv_tvl)

        await session.commit()
        print("Seed data created successfully.")
        print(f"  Protocol: {protocol.name} ({protocol.program_address})")
        print(f"  Invariant: WITHDRAWAL_RATE — $5M / 60s")
        print(f"  Invariant: TVL_DROP — 10% / 300s")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
