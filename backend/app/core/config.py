"""Pydantic Settings configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file and environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Server
    app_port: int = 8000

    # Database
    postgres_user: str
    postgres_password: str
    postgres_db: str
    db_host: str = "localhost"
    db_port: int = 5432

    # Solana
    solana_rpc_url: str
    solana_ws_url: str
    guardian_program_id: str
    sentinel_keypair: str

    # Telegram
    telegram_bot_token: str
    telegram_chat_id: str

    # CORS
    allowed_origins: str = "http://localhost:3000"

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy connection string for PostgreSQL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.db_host}:{self.db_port}/{self.postgres_db}"
        )

    @property
    def cors_origins(self) -> list[str]:
        """Parsed list of allowed CORS origins."""
        return [o.strip() for o in self.allowed_origins.split(",")]
