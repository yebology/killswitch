"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { InvariantEditor } from "@/components/protocol/invariant-editor";
import { Button } from "@/components/ui/button";
import { truncateAddress, getStatusColor } from "@/lib/utils";
import { get } from "@/lib/api";
import { INVARIANT_TYPES } from "@/constants";
import type { Protocol, Invariant } from "@/types";

/** Skeleton placeholder for loading state. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-2 ${className ?? ""}`}
    />
  );
}

/** Format a number with commas for display. */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Get human-readable label for an invariant type. */
function getTypeLabel(type: string): string {
  const info = INVARIANT_TYPES.find((t) => t.value === type);
  return info?.label ?? type;
}

/** Get unit for an invariant type. */
function getTypeUnit(type: string): string {
  const info = INVARIANT_TYPES.find((t) => t.value === type);
  return info?.unit ?? "";
}

/**
 * Protocol detail page — protected route requiring wallet connection.
 * Fetches protocol data from the API using the route param ID.
 */
export default function ProtocolDetailPage() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const protocolId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch protocol detail from API
  useEffect(() => {
    if (!isAuthenticated || !protocolId) return;

    let cancelled = false;

    const fetchProtocol = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await get<Protocol>(`/api/protocols/${protocolId}`);

        if (!cancelled) {
          setProtocol(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load protocol";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProtocol();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, protocolId]);

  /** Copy program address to clipboard. */
  const handleCopyAddress = async () => {
    if (!protocol) return;
    try {
      await navigator.clipboard.writeText(protocol.program_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy address");
    }
  };

  /** Handle new invariant added. */
  const handleInvariantAdded = (invariant: Invariant) => {
    setProtocol((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        invariants: [...(prev.invariants ?? []), invariant],
      };
    });
    setShowEditor(false);
  };

  /** Handle resume protocol. */
  const handleResume = () => {
    setProtocol((prev) => {
      if (!prev) return prev;
      return { ...prev, status: "active" };
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view protocol details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Protocol not found.</p>
      </div>
    );
  }

  const statusColor = getStatusColor(protocol.status);
  const invariants = protocol.invariants ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Protocol header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {protocol.name}
          </h1>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            {protocol.status}
          </span>
        </div>

        {/* Protocol info card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {/* Program Address */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Program Address
            </span>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-foreground">
                {truncateAddress(protocol.program_address)}
              </code>
              <button
                onClick={handleCopyAddress}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <svg
                    className="h-4 w-4 text-status-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Telegram Chat ID */}
          {protocol.telegram_chat_id && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Telegram Chat ID
              </span>
              <span className="font-mono text-sm text-foreground">
                {protocol.telegram_chat_id}
              </span>
            </div>
          )}

          {/* Created At */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Created</span>
            <span className="text-sm text-foreground">
              {new Date(protocol.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Resume button when paused */}
        {protocol.status === "paused" && (
          <Button
            onClick={handleResume}
            className="bg-status-green text-white hover:bg-status-green/90"
            size="lg"
          >
            Resume Protocol
          </Button>
        )}
      </div>

      {/* Invariant Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Invariant Rules
          </h2>
          <Button
            onClick={() => setShowEditor(!showEditor)}
            variant={showEditor ? "outline" : "default"}
            size="sm"
          >
            {showEditor ? "Cancel" : "+ Add Rule"}
          </Button>
        </div>

        {/* Invariant Editor (shown when Add Rule is clicked) */}
        {showEditor && (
          <div className="rounded-xl border border-border bg-card p-4">
            <InvariantEditor
              protocolId={protocol.id}
              onSuccess={handleInvariantAdded}
            />
          </div>
        )}

        {/* Invariant list */}
        {invariants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No invariant rules configured yet. Add your first rule to start
              monitoring.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invariants.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {getTypeLabel(inv.type)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.action === "pause"
                          ? "bg-status-red/10 text-status-red"
                          : "bg-status-yellow/10 text-status-yellow"
                      }`}
                    >
                      {inv.action}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Threshold: {formatNumber(inv.threshold)}
                    {getTypeUnit(inv.type)
                      ? ` ${getTypeUnit(inv.type)}`
                      : ""}{" "}
                    · Window: {inv.time_window}s
                  </p>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    inv.enabled ? "bg-status-green" : "bg-muted-foreground"
                  }`}
                  title={inv.enabled ? "Enabled" : "Disabled"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
