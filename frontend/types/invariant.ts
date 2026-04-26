/** Supported invariant rule types for protocol monitoring. */
export type InvariantType =
  | "WITHDRAWAL_RATE"
  | "TVL_DROP"
  | "ADMIN_KEY_CHANGE"
  | "SINGLE_TX_SIZE"
  | "PARAMETER_CHANGE";

/** Action to take when an invariant rule is breached. */
export type InvariantAction = "pause" | "alert";

/** An invariant rule configured for a protocol. */
export interface Invariant {
  id: string;
  protocol_id: string;
  type: InvariantType;
  threshold: number;
  time_window: number;
  action: InvariantAction;
  enabled: boolean;
}

/** Result of evaluating an invariant rule against current metrics. */
export interface InvariantEvaluation {
  invariant_id: string;
  invariant_type: InvariantType;
  status: "pass" | "warning" | "breach";
  measured_value: number;
  threshold: number;
}
