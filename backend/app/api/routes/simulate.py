"""Simulation router — Drift hack replay endpoint."""

import logging

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_simulator_service
from app.api.response import success_response
from app.constants import MSG_SIMULATION_COMPLETE
from app.schemas.requests import SimulationParams
from app.services.simulator import SimulatorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulate", tags=["simulate"])


@router.get("/drift")
async def simulate_drift(
    withdrawal_rate_threshold: float | None = Query(None, description="Withdrawal rate threshold in USD"),
    withdrawal_rate_window: int | None = Query(None, description="Withdrawal rate time window in seconds"),
    tvl_drop_threshold: float | None = Query(None, description="TVL drop threshold in percent"),
    tvl_drop_window: int | None = Query(None, description="TVL drop time window in seconds"),
    service: SimulatorService = Depends(get_simulator_service),
):
    """Run the Drift hack simulation with adjustable parameters.

    GET /api/simulate/drift
    Public endpoint — no auth required.
    """
    params = SimulationParams(
        withdrawal_rate_threshold=withdrawal_rate_threshold,
        withdrawal_rate_window=withdrawal_rate_window,
        tvl_drop_threshold=tvl_drop_threshold,
        tvl_drop_window=tvl_drop_window,
    )
    result = await service.run_drift_simulation(params)
    return success_response(
        data=result.model_dump(mode="json"),
        message=MSG_SIMULATION_COMPLETE,
    )
