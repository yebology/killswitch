"use client";

import { cn } from "@/lib/utils";
import { classifyInvariantStatus } from "@/lib/utils";
import { INVARIANT_TYPES } from "@/constants";
import type { InvariantEvaluation } from "@/types";

interface InvariantStatusProps {
  evaluations: InvariantEvaluation[];
}

/**
 * Returns the label for an invariant type from the INVARIANT_TYPES constant.
 * Falls back to the raw type string if not found.
 */
function getInvariantLabel(type: string): string {
  const info = INVARIANT_TYPES.find((t) => t.value === type);
  return info?.label ?? type;
}

/** Tailwind classes for progress bar fill based on status. */
const PROGRESS_BAR_CLASSES: Record<string, string> = {
  pass: "bg-status-green",
  warning: "bg-status-yellow",
  breach: "bg-status-red",
};

/** Tailwind classes for status text color. */
const STATUS_TEXT_CLASSES: Record<string, string> = {
  pass: "text-status-green",
  warning: "text-status-yellow",
  breach: "text-status-red",
};

/**
 * Displays invariant evaluation results as cards with progress bars.
 * Each card shows the measured/threshold ratio with color coding:
 * green (<50%), yellow (50-99%), red (≥100%).
 */
export function InvariantStatus({ evaluations }: InvariantStatusProps) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Invariant Rules
        </h3>
        <p className="py-4 text-center text-xs text-muted-foreground">
          No invariant rules configured
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Invariant Rules
      </h3>

      <div className="space-y-3">
        {evaluations.map((evaluation) => {
          const status = classifyInvariantStatus(
            evaluation.measured_value,
            evaluation.threshold
          );
          const percentage =
            evaluation.threshold > 0
              ? (evaluation.measured_value / evaluation.threshold) * 100
              : 100;
          // Cap display at 100% for the bar width
          const barWidth = Math.min(percentage, 100);

          return (
            <div
              key={evaluation.invariant_id}
              className="rounded-md bg-surface-2/50 p-3"
            >
              {/* Header: type label + percentage */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  {getInvariantLabel(evaluation.invariant_type)}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    STATUS_TEXT_CLASSES[status]
                  )}
                >
                  {percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    PROGRESS_BAR_CLASSES[status]
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Details: threshold + measured value */}
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Threshold: {evaluation.threshold}
                </span>
                <span>
                  Current: {evaluation.measured_value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
