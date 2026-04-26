"use client";

import { cn, getStatusColor } from "@/lib/utils";
import type { SimulationEvent } from "@/types";

interface DriftReplayProps {
  /** Full list of simulation events. */
  events: SimulationEvent[];
  /** Index of the current event being displayed. */
  currentIndex: number;
}

/** Color mapping for eval results. */
const EVAL_COLORS: Record<string, string> = {
  pass: "#22c55e",
  warning: "#eab308",
  breach: "#ef4444",
};

/** Format a dollar amount for display. */
function formatDollar(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

/** Format ISO timestamp to readable time. */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Visual timeline of the Drift hack simulation.
 * Displays events as a vertical timeline with color-coded nodes.
 * Events up to currentIndex are visible; rest are dimmed.
 */
export function DriftReplay({ events, currentIndex }: DriftReplayProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Run the simulation to see the Drift hack timeline.
        </p>
      </div>
    );
  }

  // Current cumulative drain from the latest visible event
  const currentDrain =
    currentIndex >= 0 && currentIndex < events.length
      ? events[currentIndex].cumulative_drain
      : 0;

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="relative space-y-0">
          {events.map((event, index) => {
            const isVisible = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const isPauseEvent = event.response_action === "pause";
            const evalColor = EVAL_COLORS[event.eval_result] ?? "#a1a1aa";
            const threatColor = getStatusColor(event.threat_level);

            return (
              <div
                key={index}
                className={cn(
                  "relative flex gap-4 pb-6 last:pb-0 transition-opacity duration-300",
                  isVisible ? "opacity-100" : "opacity-20"
                )}
              >
                {/* Timeline line + node */}
                <div className="flex flex-col items-center">
                  {/* Node */}
                  <div
                    className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: evalColor,
                      backgroundColor: isVisible ? evalColor : "transparent",
                      // Ring color applied via Tailwind ring utility + inline border
                      boxShadow: isCurrent
                        ? `0 0 0 2px var(--color-card), 0 0 0 4px ${evalColor}`
                        : undefined,
                    }}
                  />
                  {/* Connecting line */}
                  {index < events.length - 1 && (
                    <div
                      className="w-0.5 grow"
                      style={{
                        backgroundColor: isVisible
                          ? `${evalColor}40`
                          : "rgba(255,255,255,0.05)",
                      }}
                    />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 space-y-1.5 pb-2">
                  {/* Circuit breaker banner */}
                  {isPauseEvent && isVisible && (
                    <div className="mb-2 rounded-lg border border-status-red/50 bg-status-red/10 px-3 py-2 text-center">
                      <span className="text-sm font-bold text-status-red">
                        🛑 CIRCUIT BREAKER TRIGGERED
                      </span>
                    </div>
                  )}

                  {/* Timestamp + description */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {event.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Eval result badge */}
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${evalColor}20`,
                        color: evalColor,
                      }}
                    >
                      {event.eval_result}
                    </span>

                    {/* Threat level badge */}
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${threatColor}20`,
                        color: threatColor,
                      }}
                    >
                      {event.threat_level}
                    </span>

                    {/* Response action badge */}
                    <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                      {event.response_action}
                    </span>

                    {/* Cumulative drain */}
                    {event.cumulative_drain > 0 && (
                      <span className="text-xs font-mono text-status-red">
                        {formatDollar(event.cumulative_drain)} drained
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Running cumulative drain counter */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">
          Cumulative Drain
        </p>
        <p className="text-2xl font-bold font-mono text-status-red">
          {formatDollar(currentDrain)}
        </p>
      </div>
    </div>
  );
}
