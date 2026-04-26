"""Custom exception classes and global exception handler for FastAPI."""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(HTTPException):
    """Custom application error with consistent structure."""

    def __init__(
        self, status_code: int, message: str, details: str | None = None
    ):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.details = details


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    """Global exception handler that wraps AppError into API response envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "data": None,
        },
    )


async def generic_exception_handler(
    _request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "data": None,
        },
    )
