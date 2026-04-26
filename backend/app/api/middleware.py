"""Middleware configuration — CORS and exception handlers."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.core.exceptions import AppError, app_error_handler, generic_exception_handler

logger = logging.getLogger(__name__)


def setup_middleware(app: FastAPI, settings: Settings) -> None:
    """Configure CORS middleware and global exception handlers."""

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("CORS configured for origins: %s", settings.cors_origins)

    # Exception handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
