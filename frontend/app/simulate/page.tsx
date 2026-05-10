"use client";

import { useState, useCallback, useRef } from "react";
import { SimulationControls } from "@/components/simulate/simulation-controls";
import { DriftReplay } from "@/components/simulate/drift-replay";
import { SimulationSummary } from "@/components/simulate/simulation-summary";
import { useSimulation } from "@/hooks/use-simulation";
import { get } from "@/lib/api";
import type { SimulationEvent, SimulationResult, InvariantResponse } from "@/types";

/**
 * Simulation page — public route, no auth required.
 * Fetches simulation data from the API and replays the Drift hack timeline.
 */
export default function SimulatePage() {
  // Adjustable parameters
  const [withdrawalThreshold, setWithdrawalThreshold] = useState("5000000");
  const [withdrawalWindow, setWithdrawalWindow] = useState("60");
  const [tvlDropThreshold, setTvlDropThreshold] = useState("10");
  const [tvlDropWindow, setTvlDropWindow] = useState("300");

  // Simulation state
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Store fetched simulation data
  const [timeline, setTimeline] = useState<SimulationEvent[]>([]);
  const [damageWithout, setDamageWithout] = useState(285_000_000);
  const [rulesUsed, setRulesUsed] = useState<InvariantResponse[]>([]);
  const [apiDamageWithKillswitch, setApiDamageWithKillswitch] = useState(0);
  const [apiAmountSaved, setApiAmountSaved] = useState(0);

  const simulation = useSimulation(hasStarted ? timeline : []);

  // Use a ref to track timeline length for completion check
  const timelineLengthRef = useRef(0);
  timelineLengthRef.current = timeline.length;

  const isComplete =
    hasStarted &&
    timeline.length > 0 &&
    simulation.currentIndex >= timeline.length - 1 &&
    !simulation.isPlaying;

  // Use API-provided damage values if available, otherwise compute from timeline
  const damageWithKillswitch =
    isComplete && apiDamageWithKillswitch > 0
      ? apiDamageWithKillswitch
      : isComplete && timeline.length > 0
        ? timeline[timeline.length - 1].cumulative_drain
        : 0;

  const amountSaved =
    isComplete && apiAmountSaved > 0
      ? apiAmountSaved
      : damageWithout - damageWithKillswitch;

  /** Run the simulation with current parameters. */
  const handleRunSimulation = useCallback(async () => {
    setIsLoadingSimulation(true);
    setSimulationError(null);

    try {
      // Build query string from parameters
      const params = new URLSearchParams({
        withdrawal_rate_threshold: withdrawalThreshold,
        withdrawal_rate_window: withdrawalWindow,
        tvl_drop_threshold: tvlDropThreshold,
        tvl_drop_window: tvlDropWindow,
      });

      const result = await get<SimulationResult>(
        `/api/simulate/drift?${params.toString()}`
      );

      // Store simulation data
      setTimeline(result.timeline);
      setDamageWithout(result.damage_without);
      setRulesUsed(result.rules_used);
      setApiDamageWithKillswitch(result.damage_with_killswitch);
      setApiAmountSaved(result.amount_saved);

      // Reset and start playback
      simulation.reset();
      setHasStarted(true);

      // Small delay to let state settle, then play
      setTimeout(() => {
        simulation.play();
      }, 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run simulation";
      setSimulationError(message);
    } finally {
      setIsLoadingSimulation(false);
    }
  }, [
    withdrawalThreshold,
    withdrawalWindow,
    tvlDropThreshold,
    tvlDropWindow,
    simulation,
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Drift Hack Replay
        </h1>
        <p className="text-sm text-muted-foreground">
          Replay the April 1, 2026 Drift Protocol exploit ($285M lost in 12
          minutes) and see how Killswitch would have stopped it.
        </p>
      </div>

      {/* Parameter inputs */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Simulation Parameters
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Withdrawal Rate Threshold */}
          <div className="space-y-1.5">
            <label
              htmlFor="withdrawal-threshold"
              className="block text-xs text-muted-foreground"
            >
              Withdrawal Rate Threshold ($)
            </label>
            <input
              id="withdrawal-threshold"
              type="number"
              value={withdrawalThreshold}
              onChange={(e) => setWithdrawalThreshold(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Withdrawal Rate Window */}
          <div className="space-y-1.5">
            <label
              htmlFor="withdrawal-window"
              className="block text-xs text-muted-foreground"
            >
              Withdrawal Rate Window (seconds)
            </label>
            <input
              id="withdrawal-window"
              type="number"
              value={withdrawalWindow}
              onChange={(e) => setWithdrawalWindow(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* TVL Drop Threshold */}
          <div className="space-y-1.5">
            <label
              htmlFor="tvl-threshold"
              className="block text-xs text-muted-foreground"
            >
              TVL Drop Threshold (%)
            </label>
            <input
              id="tvl-threshold"
              type="number"
              value={tvlDropThreshold}
              onChange={(e) => setTvlDropThreshold(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* TVL Drop Window */}
          <div className="space-y-1.5">
            <label
              htmlFor="tvl-window"
              className="block text-xs text-muted-foreground"
            >
              TVL Drop Window (seconds)
            </label>
            <input
              id="tvl-window"
              type="number"
              value={tvlDropWindow}
              onChange={(e) => setTvlDropWindow(e.target.value)}
              min="1"
              className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Error message */}
        {simulationError && (
          <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-sm text-status-red">
            {simulationError}
          </div>
        )}

        {/* Run Simulation button */}
        <button
          onClick={handleRunSimulation}
          disabled={isLoadingSimulation}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoadingSimulation ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading Simulation...
            </span>
          ) : hasStarted ? (
            "Re-run Simulation"
          ) : (
            "Run Simulation"
          )}
        </button>
      </div>

      {/* Simulation playback area */}
      {hasStarted && timeline.length > 0 && (
        <>
          {/* Controls */}
          <SimulationControls
            isPlaying={simulation.isPlaying}
            speed={simulation.speed}
            currentIndex={simulation.currentIndex}
            totalEvents={timeline.length}
            onPlay={simulation.play}
            onPause={simulation.pause}
            onReset={simulation.reset}
            onSpeedChange={(s) =>
              simulation.setSpeed(s as 1 | 2 | 4)
            }
          />

          {/* Timeline replay */}
          <DriftReplay
            events={timeline}
            currentIndex={simulation.currentIndex}
          />

          {/* Summary — shown after simulation completes */}
          {isComplete && (
            <SimulationSummary
              damageWithKillswitch={damageWithKillswitch}
              damageWithout={damageWithout}
              amountSaved={amountSaved}
              rulesUsed={rulesUsed}
            />
          )}
        </>
      )}
    </div>
  );
}
