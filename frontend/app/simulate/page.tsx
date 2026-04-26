"use client";

import { useState, useCallback } from "react";
import { SimulationControls } from "@/components/simulate/simulation-controls";
import { DriftReplay } from "@/components/simulate/drift-replay";
import { SimulationSummary } from "@/components/simulate/simulation-summary";
import { useSimulation } from "@/hooks/use-simulation";
import type { SimulationEvent, InvariantResponse } from "@/types";

/** Dummy simulation timeline — hardcoded Drift hack replay. */
const DUMMY_TIMELINE: SimulationEvent[] = [
  {
    timestamp: "2026-04-01T12:00:00Z",
    event_type: "admin_change",
    description: "Admin key changed via compromised multisig",
    eval_result: "breach",
    threat_level: "ELEVATED",
    response_action: "alert",
    cumulative_drain: 0,
  },
  {
    timestamp: "2026-04-01T12:00:30Z",
    event_type: "parameter_change",
    description: "Withdrawal safety limits removed",
    eval_result: "breach",
    threat_level: "HIGH",
    response_action: "alert",
    cumulative_drain: 0,
  },
  {
    timestamp: "2026-04-01T12:01:00Z",
    event_type: "withdrawal",
    description: "$2M withdrawn from vault",
    eval_result: "warning",
    threat_level: "HIGH",
    response_action: "monitor",
    cumulative_drain: 2_000_000,
  },
  {
    timestamp: "2026-04-01T12:01:30Z",
    event_type: "withdrawal",
    description: "$4M total withdrawn",
    eval_result: "warning",
    threat_level: "HIGH",
    response_action: "monitor",
    cumulative_drain: 4_000_000,
  },
  {
    timestamp: "2026-04-01T12:02:00Z",
    event_type: "withdrawal",
    description: "$6M total — THRESHOLD BREACHED",
    eval_result: "breach",
    threat_level: "CRITICAL",
    response_action: "pause",
    cumulative_drain: 6_000_000,
  },
  {
    timestamp: "2026-04-01T12:02:01Z",
    event_type: "alert",
    description: "Emergency Telegram alert dispatched to team",
    eval_result: "breach",
    threat_level: "CRITICAL",
    response_action: "pause",
    cumulative_drain: 6_000_000,
  },
];

/** Dummy rules used in the simulation. */
const DUMMY_RULES_USED: InvariantResponse[] = [
  {
    id: "sim-inv-1",
    protocol_id: "sim-proto",
    type: "WITHDRAWAL_RATE",
    threshold: 5_000_000,
    time_window: 60,
    action: "pause",
    enabled: true,
  },
  {
    id: "sim-inv-2",
    protocol_id: "sim-proto",
    type: "TVL_DROP",
    threshold: 10,
    time_window: 300,
    action: "pause",
    enabled: true,
  },
];

/** Damage without Killswitch (original Drift hack). */
const DAMAGE_WITHOUT = 285_000_000;

/**
 * Simulation page — public route, no auth required.
 * Allows users to adjust parameters and replay the Drift hack simulation.
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

  const simulation = useSimulation(hasStarted ? DUMMY_TIMELINE : []);

  const isComplete =
    hasStarted &&
    DUMMY_TIMELINE.length > 0 &&
    simulation.currentIndex >= DUMMY_TIMELINE.length - 1 &&
    !simulation.isPlaying;

  // Damage with Killswitch = cumulative drain at the pause event
  const damageWithKillswitch =
    isComplete && DUMMY_TIMELINE.length > 0
      ? DUMMY_TIMELINE[DUMMY_TIMELINE.length - 1].cumulative_drain
      : 0;

  /** Run the simulation with current parameters. */
  const handleRunSimulation = useCallback(async () => {
    // Log the parameters (will wire to API later)
    console.log("[SimulatePage] Run simulation with params:", {
      withdrawal_rate_threshold: Number(withdrawalThreshold),
      withdrawal_rate_window: Number(withdrawalWindow),
      tvl_drop_threshold: Number(tvlDropThreshold),
      tvl_drop_window: Number(tvlDropWindow),
    });

    setIsLoadingSimulation(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Reset and start
    simulation.reset();
    setHasStarted(true);
    setIsLoadingSimulation(false);

    // Small delay to let state settle, then play
    setTimeout(() => {
      simulation.play();
    }, 100);
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
          Drift Hack Simulation
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
      {hasStarted && (
        <>
          {/* Controls */}
          <SimulationControls
            isPlaying={simulation.isPlaying}
            speed={simulation.speed}
            currentIndex={simulation.currentIndex}
            totalEvents={DUMMY_TIMELINE.length}
            onPlay={simulation.play}
            onPause={simulation.pause}
            onReset={simulation.reset}
            onSpeedChange={(s) =>
              simulation.setSpeed(s as 1 | 2 | 4)
            }
          />

          {/* Timeline replay */}
          <DriftReplay
            events={DUMMY_TIMELINE}
            currentIndex={simulation.currentIndex}
          />

          {/* Summary — shown after simulation completes */}
          {isComplete && (
            <SimulationSummary
              damageWithKillswitch={damageWithKillswitch}
              damageWithout={DAMAGE_WITHOUT}
              amountSaved={DAMAGE_WITHOUT - damageWithKillswitch}
              rulesUsed={DUMMY_RULES_USED}
            />
          )}
        </>
      )}
    </div>
  );
}
