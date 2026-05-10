"""Protocol router — CRUD endpoints for protocol management."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import get_current_wallet, get_protocol_service
from app.api.response import error_response, success_response
from app.constants import (
    ERR_PROTOCOL_ALREADY_EXISTS,
    ERR_PROTOCOL_NOT_FOUND,
    MSG_PROTOCOL_DETAIL,
    MSG_PROTOCOL_REGISTERED,
    MSG_PROTOCOL_RESUMED,
    MSG_PROTOCOLS_LISTED,
)
from app.core.exceptions import AppError
from app.schemas.requests import RegisterProtocolRequest
from app.services.protocol import ProtocolService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/protocols", tags=["protocols"])


@router.post("")
async def register_protocol(
    req: RegisterProtocolRequest,
    wallet: str = Depends(get_current_wallet),
    service: ProtocolService = Depends(get_protocol_service),
):
    """Register a new protocol for monitoring.

    POST /api/protocols
    """
    try:
        protocol = await service.register_protocol(req, wallet)
        return success_response(
            data=protocol.model_dump(mode="json"),
            message=MSG_PROTOCOL_REGISTERED,
            status_code=201,
        )
    except AppError as e:
        return error_response(e.message, status_code=e.status_code)


@router.get("")
async def list_protocols(
    wallet: str = Depends(get_current_wallet),
    service: ProtocolService = Depends(get_protocol_service),
):
    """List all protocols owned by the authenticated wallet.

    GET /api/protocols
    """
    protocols = await service.list_protocols(wallet)
    return success_response(
        data=[p.model_dump(mode="json") for p in protocols],
        message=MSG_PROTOCOLS_LISTED,
    )


@router.get("/{protocol_id}")
async def get_protocol(
    protocol_id: UUID,
    wallet: str = Depends(get_current_wallet),
    service: ProtocolService = Depends(get_protocol_service),
):
    """Get protocol detail with invariants.

    GET /api/protocols/{id}
    """
    try:
        protocol = await service.get_protocol(protocol_id, wallet)
        return success_response(
            data=protocol.model_dump(mode="json"),
            message=MSG_PROTOCOL_DETAIL,
        )
    except AppError as e:
        return error_response(e.message, status_code=e.status_code)


@router.post("/{protocol_id}/resume")
async def resume_protocol(
    protocol_id: UUID,
    wallet: str = Depends(get_current_wallet),
    service: ProtocolService = Depends(get_protocol_service),
):
    """Resume a paused protocol.

    POST /api/protocols/{id}/resume
    """
    try:
        protocol = await service.resume_protocol(protocol_id, wallet)

        # Notify sentinel to set cooldown (prevent immediate re-pause from mock TXs)
        from app.api.routes.internal import _sentinel_ref
        if _sentinel_ref:
            _sentinel_ref.mark_resumed(protocol.program_address)

        return success_response(
            data=protocol.model_dump(mode="json"),
            message=MSG_PROTOCOL_RESUMED,
        )
    except AppError as e:
        return error_response(e.message, status_code=e.status_code)
