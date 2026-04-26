"""Invariant SQLAlchemy model — a security rule attached to a protocol."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.protocol import Protocol


class Invariant(Base):
    __tablename__ = "invariants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    protocol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("protocols.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    time_window: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "pause" or "alert"
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    protocol: Mapped[Protocol] = relationship(back_populates="invariants")
