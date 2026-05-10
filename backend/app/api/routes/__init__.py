"""Route aggregator — combines all API routers under /api prefix."""

from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.internal import router as internal_router
from app.api.routes.invariant import router as invariant_router
from app.api.routes.protocol import router as protocol_router
from app.api.routes.simulate import router as simulate_router

api_router = APIRouter(prefix="/api")

# Public routes
api_router.include_router(health_router)
api_router.include_router(simulate_router)
api_router.include_router(auth_router)

# Protected routes (auth handled via Depends in each router)
api_router.include_router(protocol_router)
api_router.include_router(invariant_router)

# Internal routes (demo/testing only)
api_router.include_router(internal_router)
