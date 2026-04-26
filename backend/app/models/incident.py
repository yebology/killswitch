"""Incident SQLAlchemy model — record of a detected invariant breach."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.invariant import Invariant
    from app.models.protocol import Protocol


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    protocol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("protocols.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invariant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invariants.id"), nullable=False
    )
    trigger_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    tx_hashes: Mapped[list] = mapped_column(JSONB, default=list)
    action_taken: Mapped[str] = mapped_column(String(20), nullable=False)
    damage_estimate: Mapped[float] = mapped_column(Float, default=0.0)
    escalation_reason: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    # Relationships
    protocol: Mapped[Protocol] = relationship(back_populates="incidents")
    invariant: Mapped[Invariant] = relationship()
