"""Health check router — service status endpoint."""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.response import success_response
from app.constants import MSG_HEALTH_OK

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Service health check.

    GET /api/health
    Public endpoint — no auth required.
    """
    return success_response(
        data={
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "killswitch-sentinel",
        },
        message=MSG_HEALTH_OK,
    )
