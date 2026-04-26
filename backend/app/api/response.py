"""API response envelope helpers for consistent JSON responses."""

from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standard API response envelope."""

    status: str  # "success" or "error"
    message: str
    data: Any = None


def success_response(
    data: Any, message: str = "Success", status_code: int = 200
) -> JSONResponse:
    """Wrap a successful result in the standard envelope."""
    return JSONResponse(
        status_code=status_code,
        content=APIResponse(
            status="success", message=message, data=data
        ).model_dump(mode="json"),
    )


def error_response(message: str, status_code: int = 400) -> JSONResponse:
    """Wrap an error in the standard envelope."""
    return JSONResponse(
        status_code=status_code,
        content=APIResponse(
            status="error", message=message, data=None
        ).model_dump(mode="json"),
    )
