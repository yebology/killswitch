"use client";

import type { InvariantResponse } from "@/types";
import { INVARIANT_TYPES } from "@/constants";

interface SimulationSummaryProps {
  /** Total damage with Killswitch active. */
  damageWithKillswitch: number;
  /** Total damage without Killswitch (original Drift hack). */
  damageWithout: number;
  /** Amount saved by Killswitch. */
  amountSaved: number;
  /** Invariant rules that triggered during simulation. */
  rulesUsed: InvariantResponse[];
}

/** Format a dollar amount for display. */
function formatDollar(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

/** Get human-readable label for an invariant type. */
function getTypeLabel(type: string): string {
  const info = INVARIANT_TYPES.find((t) => t.value === type);
  return info?.label ?? type;
}

/**
 * Summary displayed after simulation completes.
 * Shows side-by-side comparison of damage with and without Killswitch.
 */
export function SimulationSummary({
  damageWithKillswitch,
  damageWithout,
  amountSaved,
  rulesUsed,
}: SimulationSummaryProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground text-center">
        Simulation Results
      </h3>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Without Killswitch */}
        <div className="rounded-xl border border-status-red/30 bg-status-red/5 p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">Without Killswitch</p>
          <p className="text-2xl font-bold font-mono text-status-red">
            {formatDollar(damageWithout)}
          </p>
          <p className="text-xs text-status-red/70">lost</p>
        </div>

        {/* With Killswitch */}
        <div className="rounded-xl border border-status-green/30 bg-status-green/5 p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">With Killswitch</p>
          <p className="text-2xl font-bold font-mono text-status-green">
            {formatDollar(damageWithKillswitch)}
          </p>
          <p className="text-xs text-status-green/70">lost</p>
        </div>
      </div>

      {/* Amount saved highlight */}
      <div className="rounded-xl border border-status-green/50 bg-status-green/10 p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Amount Saved</p>
        <p className="text-3xl font-bold font-mono text-status-green">
          {formatDollar(amountSaved)}
        </p>
      </div>

      {/* Rules used */}
      {rulesUsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Rules Triggered</p>
          <div className="space-y-1.5">
            {rulesUsed.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  {getTypeLabel(rule.type)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    rule.action === "pause"
                      ? "bg-status-red/10 text-status-red"
                      : "bg-status-yellow/10 text-status-yellow"
                  }`}
                >
                  {rule.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
