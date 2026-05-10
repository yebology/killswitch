"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { truncateAddress } from "@/lib/utils";
import type { WSTransactionData } from "@/types";

/** Default maximum number of visible entries in the feed. */
const DEFAULT_MAX_ENTRIES = 100;

interface TxFeedProps {
  transactions: WSTransactionData[];
  maxEntries?: number;
  protocolStatus?: "active" | "paused";
}

/**
 * Formats a numeric amount to a compact USD string.
 * e.g. 5000000 → "$5.00M", 1500 → "$1.50K"
 */
function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Formats an ISO timestamp to a short time string (HH:MM:SS).
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

/** Color-coded dot classes per evaluation result. */
const EVAL_DOT_CLASSES: Record<WSTransactionData["eval_result"], string> = {
  pass: "bg-status-green",
  warning: "bg-status-yellow",
  breach: "bg-status-red",
};

/**
 * Real-time scrolling transaction feed.
 * Shows newest transactions on top, auto-scrolls, and enforces FIFO max entries.
 */
export function TxFeed({
  transactions,
  maxEntries = DEFAULT_MAX_ENTRIES,
  protocolStatus,
}: TxFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only show the most recent maxEntries (FIFO)
  const visibleTxs = transactions.slice(-maxEntries).reverse();

  // Auto-scroll to top when new transactions arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [transactions.length]);

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Transaction Feed
      </h3>

      <div
        ref={scrollRef}
        className="max-h-80 space-y-1 overflow-y-auto pr-1"
      >
        {visibleTxs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {protocolStatus === "paused"
              ? "🛑 Protocol is paused — monitoring suspended"
              : "No transactions yet"}
          </p>
        ) : (
          visibleTxs.map((tx, index) => (
            <div
              key={`${tx.hash}-${index}`}
              className="flex items-center gap-2 rounded-md bg-surface-2/50 px-3 py-2 text-xs"
            >
              {/* Eval result dot */}
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  EVAL_DOT_CLASSES[tx.eval_result]
                )}
              />

              {/* Truncated hash */}
              <span className="w-20 shrink-0 truncate font-mono text-muted-foreground">
                {truncateAddress(tx.hash)}
              </span>

              {/* Instruction type */}
              <span className="w-24 shrink-0 truncate font-medium text-foreground">
                {tx.instruction}
              </span>

              {/* Formatted amount */}
              <span className="w-20 shrink-0 text-right font-mono text-foreground">
                {formatAmount(tx.amount)}
              </span>

              {/* Timestamp */}
              <span className="ml-auto shrink-0 text-muted-foreground">
                {formatTimestamp(tx.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>

      {transactions.length > 0 && (
        <p className="mt-2 text-right text-xs text-muted-foreground">
          {Math.min(transactions.length, maxEntries)} / {transactions.length} txs
        </p>
      )}
    </div>
  );
}
