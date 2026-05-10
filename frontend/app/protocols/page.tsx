"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { RegisterForm } from "@/components/protocol/register-form";
import { getStatusColor, truncateAddress } from "@/lib/utils";
import { get } from "@/lib/api";
import type { Protocol } from "@/types";
import { Shield } from "lucide-react";

/** Skeleton placeholder for loading state. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-2 ${className ?? ""}`}
    />
  );
}

/**
 * Protocols list page — protected route requiring wallet connection.
 * Fetches protocols from the API and displays them as a list.
 */
export default function ProtocolsPage() {
  const { isAuthenticated } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Fetch protocols from API
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchProtocols = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await get<Protocol[]>("/api/protocols");

        if (!cancelled) {
          setProtocols(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load protocols";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProtocols();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Connect your wallet to view protocols.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your Protocols</h1>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showRegister ? "Cancel" : "+ Register Protocol"}
        </button>
      </div>

      {showRegister && (
        <div className="rounded-xl border border-border bg-card p-4">
          <RegisterForm
            onSuccess={(proto) => {
              setProtocols((prev) => [...prev, proto]);
              setShowRegister(false);
            }}
          />
        </div>
      )}

      {protocols.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">No protocols registered yet.</p>
          <button
            onClick={() => setShowRegister(true)}
            className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Register Protocol
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {protocols.map((proto) => {
            const color = getStatusColor(proto.status);
            return (
              <Link
                key={proto.id}
                href={`/protocols/${proto.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-surface-2/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{proto.name}</span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {proto.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {truncateAddress(proto.program_address)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {proto.invariants?.length ?? 0} rules
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
