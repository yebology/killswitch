"""Auth router — wallet signature verification."""

import logging

from fastapi import APIRouter

from app.api.response import error_response, success_response
from app.constants import ERR_INVALID_WALLET_SIGNATURE, MSG_AUTH_SUCCESS
from app.core.security import verify_signature
from app.schemas.requests import VerifyWalletRequest
from app.schemas.responses import AuthResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/verify")
async def verify_wallet(req: VerifyWalletRequest):
    """Verify a wallet signature and return auth status.

    POST /api/auth/verify
    """
    is_valid = verify_signature(
        wallet_address=req.wallet_address,
        message=req.message,
        signature=req.signature,
    )

    if not is_valid:
        return error_response(ERR_INVALID_WALLET_SIGNATURE, status_code=401)

    auth = AuthResponse(
        wallet_address=req.wallet_address,
        is_guardian=True,  # Simplified: any valid wallet is treated as guardian
    )
    return success_response(
        data=auth.model_dump(),
        message=MSG_AUTH_SUCCESS,
    )
