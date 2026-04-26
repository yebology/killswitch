import type { InvariantType, InvariantAction, Invariant, InvariantEvaluation } from "./invariant";

/** Standard API response envelope from the backend. */
export interface APIEnvelope<T> {
  status: "success" | "error";
  message: string;
  data: T | null;
}

/** Request body for wallet signature verification. */
export interface AuthVerifyRequest {
  wallet_address: string;
  message: string;
  signature: string;
}

/** Response from wallet signature verification. */
export interface AuthVerifyResponse {
  wallet_address: string;
  is_guardian: boolean;
}

/** Request body for registering a new protocol. */
export interface RegisterProtocolRequest {
  program_address: string;
  name: string;
  telegram_chat_id?: string;
}

/** Request body for creating a new invariant rule. */
export interface CreateInvariantRequest {
  type: InvariantType;
  threshold: number;
  time_window: number;
  action: InvariantAction;
}

/** Adjustable parameters for the Drift hack simulation. */
export interface SimulationParams {
  withdrawal_rate_threshold?: number;
  withdrawal_rate_window?: number;
  tvl_drop_threshold?: number;
  tvl_drop_window?: number;
}

/** A single event in the simulation timeline. */
export interface SimulationEvent {
  timestamp: string;
  event_type: string;
  description: string;
  tx_details?: string;
  eval_result: "pass" | "warning" | "breach";
  threat_level: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  response_action: "monitor" | "alert" | "pause";
  cumulative_drain: number;
}

/** Invariant rule data returned in simulation results. */
export type InvariantResponse = Invariant;

/** Complete result of a Drift hack simulation run. */
export interface SimulationResult {
  timeline: SimulationEvent[];
  damage_with_killswitch: number;
  damage_without: number;
  amount_saved: number;
  rules_used: InvariantResponse[];
}

/** Combined threat level classification. */
export type ThreatLevel = "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";

/** Transaction data received via WebSocket. */
export interface WSTransactionData {
  hash: string;
  instruction: string;
  amount: number;
  timestamp: string;
  eval_result: "pass" | "warning" | "breach";
}

/** Protocol status change received via WebSocket. */
export interface WSStatusChangeData {
  status: "active" | "paused";
}

/** Threat level update received via WebSocket. */
export interface WSThreatLevelData {
  level: ThreatLevel;
  invariant_results: InvariantEvaluation[];
  escalation_reason?: string;
}

/** A message received over the WebSocket connection. */
export interface WSMessage {
  type: "transaction" | "status_change" | "threat_level";
  data: WSTransactionData | WSStatusChangeData | WSThreatLevelData;
}
