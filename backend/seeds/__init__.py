"""Seed data utilities for Killswitch Sentinel Service.

Run with: python -m seeds.seed
"""

import asyncio
import sys
from pathlib import Path

# Ensure the backend directory is on the Python path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)


async def run_seed() -> None:
    """Load config, connect to DB, run seed, and close."""
    from app.core.config import Settings
    from app.core.database import Base, engine, init_db, async_session_factory
    from seeds.seed import seed

    settings = Settings()
    init_db(settings.database_url)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run seed
    await seed()

    # Cleanup
    await engine.dispose()


def main() -> None:
    """Entry point for `python -m seeds`."""
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
