"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreatLevel } from "@/types";

interface CombinedThreatLevelProps {
  level: ThreatLevel;
  escalationReason?: string;
}

/** Badge color classes per threat level. */
const LEVEL_CLASSES: Record<ThreatLevel, string> = {
  LOW: "border-status-green/30 bg-status-green/10 text-status-green",
  ELEVATED: "border-status-yellow/30 bg-status-yellow/10 text-status-yellow",
  HIGH: "border-status-orange/30 bg-status-orange/10 text-status-orange",
  CRITICAL: "border-status-red/30 bg-status-red/10 text-status-red",
};

/** Shield icon color classes per threat level. */
const ICON_CLASSES: Record<ThreatLevel, string> = {
  LOW: "text-status-green",
  ELEVATED: "text-status-yellow",
  HIGH: "text-status-orange",
  CRITICAL: "text-status-red",
};

/**
 * Displays the overall combined threat level as a large badge.
 * LOW=green, ELEVATED=yellow, HIGH=orange, CRITICAL=red.
 * Shows escalation reason and pulsing animation on CRITICAL.
 */
export function CombinedThreatLevel({
  level,
  escalationReason,
}: CombinedThreatLevelProps) {
  const isCritical = level === "CRITICAL";

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Threat Level
      </h3>

      <div className="flex flex-col items-center gap-3 py-2">
        {/* Shield icon */}
        <div className={cn("relative", isCritical && "animate-pulse")}>
          {/* Glow effect on CRITICAL */}
          {isCritical && (
            <div className="absolute inset-0 rounded-full bg-status-red/20 blur-xl" />
          )}
          <Shield
            className={cn("relative h-10 w-10", ICON_CLASSES[level])}
            strokeWidth={1.5}
          />
        </div>

        {/* Threat level badge */}
        <div
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-bold tracking-wider",
            LEVEL_CLASSES[level],
            isCritical && "animate-pulse"
          )}
        >
          {level}
        </div>

        {/* Escalation reason — shown only on CRITICAL */}
        {isCritical && escalationReason && (
          <p className="mt-1 text-center text-xs text-status-red/80">
            {escalationReason}
          </p>
        )}
      </div>
    </div>
  );
}
