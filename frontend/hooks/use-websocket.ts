"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ThreatLevel,
  WSTransactionData,
  WSStatusChangeData,
  WSThreatLevelData,
  WSMessage,
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

/** Maximum number of transactions to keep in the feed. */
const MAX_TRANSACTIONS = 50;

/** Delay in ms before attempting reconnection. */
const RECONNECT_DELAY_MS = 3_000;

/** WebSocket base URL from environment. */
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

/**
 * Custom hook for WebSocket connection to receive real-time protocol updates.
 * Connects to the backend WS endpoint, parses incoming messages by type,
 * and auto-reconnects on disconnect.
 *
 * @param protocolId - Protocol ID to subscribe to
 * @param enabled - Whether the connection should be active
 */
export function useWebSocket(
  protocolId?: string,
  enabled: boolean = true
): UseWebSocketReturn {
  const [transactions, setTransactions] = useState<WSTransactionData[]>([]);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("LOW");
  const [invariantResults, setInvariantResults] = useState<InvariantEvaluation[]>([]);
  const [protocolStatus, setProtocolStatus] = useState<"active" | "paused">("active");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [escalationReason, setEscalationReason] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  /** Clear any pending reconnect timer. */
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  /** Handle an incoming WebSocket message. */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "transaction": {
          const tx = msg.data as WSTransactionData;
          setTransactions((prev) => [tx, ...prev].slice(0, MAX_TRANSACTIONS));
          break;
        }
        case "status_change": {
          const statusData = msg.data as WSStatusChangeData;
          setProtocolStatus(statusData.status);
          break;
        }
        case "threat_level": {
          const threatData = msg.data as WSThreatLevelData;
          setThreatLevel(threatData.level);
          setInvariantResults(threatData.invariant_results ?? []);
          setEscalationReason(threatData.escalation_reason ?? null);
          break;
        }
        default:
          // Ignore unknown message types
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  /** Connect to the WebSocket endpoint. */
  const connect = useCallback(() => {
    if (!protocolId || !enabled) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus("connecting");

    const url = `${WS_BASE_URL}/ws?protocol_id=${encodeURIComponent(protocolId)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      wsRef.current = null;

      // Auto-reconnect if we should still be connected
      if (shouldReconnectRef.current && enabled) {
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnection
    };
  }, [protocolId, enabled, handleMessage, clearReconnectTimer]);

  // Manage connection lifecycle
  useEffect(() => {
    shouldReconnectRef.current = true;

    if (protocolId && enabled) {
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionStatus("disconnected");
    };
  }, [protocolId, enabled, connect, clearReconnectTimer]);

  return {
    transactions,
    threatLevel,
    invariantResults,
    protocolStatus,
    connectionStatus,
    escalationReason,
  };
}
