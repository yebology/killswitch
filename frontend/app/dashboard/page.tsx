"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { StatusIndicator } from "@/components/dashboard/status-indicator";
import { TxFeed } from "@/components/dashboard/tx-feed";
import { InvariantStatus } from "@/components/dashboard/invariant-status";
import { CombinedThreatLevel } from "@/components/dashboard/combined-threat-level";
import type { ThreatLevel, WSTransactionData, InvariantEvaluation } from "@/types";

/** Mock protocol data for initial dashboard display. */
const MOCK_PROTOCOL = {
  name: "Demo Protocol",
  program_address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  status: "active" as const,
};

/** Mock threat level. */
const MOCK_THREAT_LEVEL: ThreatLevel = "LOW";

/** Mock invariant evaluations. */
const MOCK_EVALUATIONS: InvariantEvaluation[] = [
  {
    invariant_id: "inv-1",
    invariant_type: "WITHDRAWAL_RATE",
    status: "pass",
    measured_value: 750_000,
    threshold: 5_000_000,
  },
  {
    invariant_id: "inv-2",
    invariant_type: "TVL_DROP",
    status: "pass",
    measured_value: 0.8,
    threshold: 10,
  },
];

/** Mock transactions for the feed. */
const MOCK_TRANSACTIONS: WSTransactionData[] = [
  {
    hash: "5UfDuX8xvndQKhRzEGm7BLUxnMDRzYkFGHj2AByQd4Nh",
    instruction: "withdraw",
    amount: 250_000,
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    eval_result: "pass",
  },
  {
    hash: "3Kp9vQxRtYhNmWzJ7eFgBcDsA2LqMnXo8PjUiHkGrTbS",
    instruction: "deposit",
    amount: 1_500_000,
    timestamp: new Date(Date.now() - 45_000).toISOString(),
    eval_result: "pass",
  },
  {
    hash: "9RmTnYwXqZpLkJhGfDsA4BcVeWuIoP7MnKjHgFeDcBaQ",
    instruction: "withdraw",
    amount: 3_200_000,
    timestamp: new Date(Date.now() - 30_000).toISOString(),
    eval_result: "warning",
  },
  {
    hash: "2WqErTyUiOpAsDfGhJkLzXcVbNmQwErTyUiOpAsDfGhJ",
    instruction: "swap",
    amount: 50_000,
    timestamp: new Date(Date.now() - 15_000).toISOString(),
    eval_result: "pass",
  },
  {
    hash: "8HnBvCxZaQwSeDrFtGyHuJiKoLpMnBvCxZaQwSeDrFtG",
    instruction: "withdraw",
    amount: 4_800_000,
    timestamp: new Date(Date.now() - 5_000).toISOString(),
    eval_result: "warning",
  },
];

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
 * Composes CombinedThreatLevel, StatusIndicator, InvariantStatus, and TxFeed.
 * Uses mock data for now; will be wired to WebSocket in Task 12.
 */
export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate 1s loading delay for skeleton display
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1_000);
    return () => clearTimeout(timer);
  }, []);

  // Route protection is handled by AuthProvider, but show a message if not authenticated
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
        {/* Skeleton: threat level */}
        <Skeleton className="h-40 w-full" />

        {/* Skeleton: status + invariants row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>

        {/* Skeleton: TX feed */}
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Connection status placeholder — will be wired to WebSocket later */}
      <div className="flex items-center gap-2 rounded-md bg-surface-2/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-status-yellow" />
        <span>Koneksi terputus — data menggunakan mock</span>
      </div>

      {/* Threat level — full width top */}
      <CombinedThreatLevel level={MOCK_THREAT_LEVEL} />

      {/* Status indicator + Invariant status — side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatusIndicator
          status={MOCK_PROTOCOL.status}
          protocolName={MOCK_PROTOCOL.name}
          programAddress={MOCK_PROTOCOL.program_address}
        />
        <InvariantStatus evaluations={MOCK_EVALUATIONS} />
      </div>

      {/* Transaction feed — full width below */}
      <TxFeed transactions={MOCK_TRANSACTIONS} />
    </div>
  );
}
