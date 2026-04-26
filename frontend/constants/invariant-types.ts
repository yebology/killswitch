import type { InvariantType } from "../types";

/** Metadata for an invariant rule type, used in dropdowns and configuration UI. */
export interface InvariantTypeInfo {
  /** The invariant type enum value. */
  value: InvariantType;
  /** Human-readable label for display. */
  label: string;
  /** Short description of what this invariant monitors. */
  description: string;
  /** Unit of measurement for the threshold value. */
  unit: string;
  /** Suggested default threshold when creating a new rule. */
  defaultThreshold: number;
  /** Suggested default time window in seconds. */
  defaultTimeWindow: number;
}

/**
 * All supported invariant types with their display metadata and defaults.
 * Used by InvariantEditor dropdown and configuration forms.
 */
export const INVARIANT_TYPES: InvariantTypeInfo[] = [
  {
    value: "WITHDRAWAL_RATE",
    label: "Withdrawal Rate",
    description: "Maximum withdrawal amount within time window",
    unit: "$",
    defaultThreshold: 5_000_000,
    defaultTimeWindow: 60,
  },
  {
    value: "TVL_DROP",
    label: "TVL Drop",
    description: "Maximum TVL percentage drop within time window",
    unit: "%",
    defaultThreshold: 10,
    defaultTimeWindow: 300,
  },
  {
    value: "ADMIN_KEY_CHANGE",
    label: "Admin Key Change",
    description: "Detect any authority or admin key changes",
    unit: "any",
    defaultThreshold: 1,
    defaultTimeWindow: 1,
  },
  {
    value: "SINGLE_TX_SIZE",
    label: "Single TX Size",
    description: "Maximum single transaction amount",
    unit: "$",
    defaultThreshold: 1_000_000,
    defaultTimeWindow: 1,
  },
  {
    value: "PARAMETER_CHANGE",
    label: "Parameter Change",
    description: "Detect safety parameter modifications",
    unit: "any",
    defaultThreshold: 1,
    defaultTimeWindow: 1,
  },
];
