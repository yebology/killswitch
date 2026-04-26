"use client";

import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils";
import { truncateAddress } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "paused" | "warning";
  protocolName: string;
  programAddress: string;
}

/** Status label mapping for display text. */
const STATUS_LABELS: Record<StatusIndicatorProps["status"], string> = {
  active: "Active",
  warning: "Warning",
  paused: "Paused",
};

/**
 * Displays protocol health status with a color-coded pulsing dot.
 * Green = active, yellow = warning, red = paused.
 */
export function StatusIndicator({
  status,
  protocolName,
  programAddress,
}: StatusIndicatorProps) {
  const color = getStatusColor(status);

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-3">
        {/* Pulsing status dot */}
        <div className="relative flex h-3 w-3">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              status === "active" && "bg-status-green",
              status === "warning" && "bg-status-yellow",
              status === "paused" && "bg-status-red"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-3 w-3 rounded-full",
              status === "active" && "bg-status-green",
              status === "warning" && "bg-status-yellow",
              status === "paused" && "bg-status-red"
            )}
          />
        </div>

        <div className="flex flex-col">
          <span
            className="text-sm font-semibold"
            style={{ color }}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-sm font-medium text-foreground">{protocolName}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {truncateAddress(programAddress)}
        </p>
      </div>
    </div>
  );
}
