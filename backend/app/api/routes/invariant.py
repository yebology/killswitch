"""Invariant router — endpoints for invariant rule management."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_wallet, get_invariant_service
from app.api.response import error_response, success_response
from app.constants import MSG_INVARIANT_CREATED, MSG_INVARIANTS_LISTED
from app.core.exceptions import AppError
from app.schemas.requests import CreateInvariantRequest
from app.services.invariant import InvariantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/protocols", tags=["invariants"])


@router.post("/{protocol_id}/invariants")
async def create_invariant(
    protocol_id: UUID,
    req: CreateInvariantRequest,
    wallet: str = Depends(get_current_wallet),
    service: InvariantService = Depends(get_invariant_service),
):
    """Add an invariant rule to a protocol.

    POST /api/protocols/{id}/invariants
    """
    try:
        invariant = await service.create_invariant(protocol_id, req)
        return success_response(
            data=invariant.model_dump(mode="json"),
            message=MSG_INVARIANT_CREATED,
            status_code=201,
        )
    except AppError as e:
        return error_response(e.message, status_code=e.status_code)


@router.get("/{protocol_id}/invariants")
async def list_invariants(
    protocol_id: UUID,
    wallet: str = Depends(get_current_wallet),
    service: InvariantService = Depends(get_invariant_service),
):
    """List all invariant rules for a protocol.

    GET /api/protocols/{id}/invariants
    """
    invariants = await service.list_invariants(protocol_id)
    return success_response(
        data=[inv.model_dump(mode="json") for inv in invariants],
        message=MSG_INVARIANTS_LISTED,
    )
