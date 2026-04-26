"use client";

import { useState } from "react";
import type {
  ThreatLevel,
  WSTransactionData,
  InvariantEvaluation,
} from "@/types";

/** Connection status for the WebSocket. */
export type ConnectionStatus = "connected" | "connecting" | "disconnected";

/** Return type for the useWebSocket hook. */
export interface UseWebSocketReturn {
  /** Recent transactions received via WebSocket. */
  transactions: WSTransactionData[];
  /** Current combined threat level. */
  threatLevel: ThreatLevel;
  /** Current invariant evaluation results. */
  invariantResults: InvariantEvaluation[];
  /** Current protocol status. */
  protocolStatus: "active" | "paused";
  /** WebSocket connection status. */
  connectionStatus: ConnectionStatus;
  /** Reason for escalation when threat level is CRITICAL. */
  escalationReason: string | null;
}

/**
 * Custom hook for WebSocket connection to receive real-time protocol updates.
 * Currently returns MOCK data — will wire to actual WebSocket in Task 12.
 *
 * @param _protocolId - Protocol ID to subscribe to (unused for now)
 * @param _enabled - Whether the connection should be active (unused for now)
 */
export function useWebSocket(
  _protocolId?: string,
  _enabled: boolean = true
): UseWebSocketReturn {
  // Mock state — always disconnected for now
  const [transactions] = useState<WSTransactionData[]>([]);
  const [threatLevel] = useState<ThreatLevel>("LOW");
  const [invariantResults] = useState<InvariantEvaluation[]>([]);
  const [protocolStatus] = useState<"active" | "paused">("active");
  const [escalationReason] = useState<string | null>(null);

  return {
    transactions,
    threatLevel,
    invariantResults,
    protocolStatus,
    connectionStatus: "disconnected",
    escalationReason,
  };
}
