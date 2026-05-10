"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { StatusIndicator } from "@/components/dashboard/status-indicator";
import { TxFeed } from "@/components/dashboard/tx-feed";
import { InvariantStatus } from "@/components/dashboard/invariant-status";
import { CombinedThreatLevel } from "@/components/dashboard/combined-threat-level";
import { useWebSocket } from "@/hooks/use-websocket";
import { get } from "@/lib/api";
import type { Protocol } from "@/types";

/** Skeleton placeholder for loading state. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-2 ${className ?? ""}`}
    />
  );
}

/**
 * Dashboard monitoring page — protected route requiring wallet connection.
 * Fetches the user's first protocol from the API and wires real-time
 * WebSocket data for TX feed, threat level, and invariant status.
 */
export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's first protocol
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchProtocol = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get list of protocols, pick the first one
        const protocols = await get<Protocol[]>("/api/protocols");

        if (cancelled) return;

        if (!protocols || protocols.length === 0) {
          setProtocol(null);
          setIsLoading(false);
          return;
        }

        // Fetch full detail for the first protocol
        const detail = await get<Protocol>(`/api/protocols/${protocols[0].id}`);

        if (cancelled) return;

        setProtocol(detail);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load protocol data";
        setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProtocol();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Wire WebSocket with real protocol ID
  const {
    transactions,
    threatLevel,
    invariantResults,
    protocolStatus,
    connectionStatus,
    escalationReason,
  } = useWebSocket(protocol?.id, !!protocol);

  // Use fetched protocol status as source of truth
  // If protocol is paused, threat level should show CRITICAL
  const currentStatus = protocol?.status ?? "active";
  const displayThreatLevel = currentStatus === "paused" ? "CRITICAL" : threatLevel;

  // Route protection is handled by AuthProvider
  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Connect your wallet to access the dashboard.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-status-red">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">
          No protocols registered yet.
        </p>
        <Link
          href="/protocols"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Register a Protocol
        </Link>
      </div>
    );
  }

  /** Connection status indicator color. */
  const connectionColor =
    connectionStatus === "connected"
      ? "bg-status-green"
      : connectionStatus === "connecting"
        ? "bg-status-yellow"
        : "bg-status-red";

  const connectionLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "connecting"
        ? "Connecting..."
        : "Disconnected";

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Connection status */}
      <div className="flex items-center gap-2 rounded-md bg-surface-2/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${connectionColor}`} />
        <span>{connectionLabel}</span>
        {escalationReason && (
          <span className="ml-2 text-status-red">— {escalationReason}</span>
        )}
      </div>

      {/* Threat level — full width top */}
      <CombinedThreatLevel level={displayThreatLevel} />

      {/* Status indicator + Invariant status — side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatusIndicator
          status={currentStatus}
          protocolName={protocol.name}
          programAddress={protocol.program_address}
        />
        <InvariantStatus
          evaluations={
            invariantResults.length > 0
              ? invariantResults
              : (protocol.invariants ?? []).map((inv) => ({
                  invariant_id: inv.id,
                  invariant_type: inv.type,
                  measured_value: currentStatus === "paused" ? inv.threshold * 1.2 : 0,
                  threshold: inv.threshold,
                  status: currentStatus === "paused" ? ("breach" as const) : ("pass" as const),
                }))
          }
        />
      </div>

      {/* Transaction feed — full width below */}
      <TxFeed transactions={transactions} protocolStatus={currentStatus} />
    </div>
  );
}
