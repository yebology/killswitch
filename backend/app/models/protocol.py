"""Protocol SQLAlchemy model — represents a Solana program registered for monitoring."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.invariant import Invariant


class Protocol(Base):
    __tablename__ = "protocols"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    program_address: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    guardian_wallet: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    telegram_chat_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    invariants: Mapped[list[Invariant]] = relationship(
        back_populates="protocol", cascade="all, delete-orphan"
    )
    incidents: Mapped[list[Incident]] = relationship(
        back_populates="protocol", cascade="all, delete-orphan"
    )
