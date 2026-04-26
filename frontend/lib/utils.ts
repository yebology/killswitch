import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a wallet/program address to first 4 + last 4 chars.
 * @param address - Full address string
 * @returns Truncated format like "AbCd...WxYz"
 */
export function truncateAddress(address: string): string {
  if (address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Classifies invariant evaluation status based on measured value vs threshold.
 * @param measuredValue - Current measured value
 * @param threshold - Configured threshold (must be > 0)
 * @returns "pass" (<50%), "warning" (50-99%), "breach" (≥100%)
 */
export function classifyInvariantStatus(
  measuredValue: number,
  threshold: number
): "pass" | "warning" | "breach" {
  if (threshold <= 0) return "breach";
  const ratio = measuredValue / threshold;
  if (ratio >= 1) return "breach";
  if (ratio >= 0.5) return "warning";
  return "pass";
}

/**
 * Validates if a string is a valid Solana public key (base58, 32-44 chars).
 * @param address - String to validate
 * @returns true if valid Solana public key format
 */
export function isValidSolanaPublicKey(address: string): boolean {
  if (address.length < 32 || address.length > 44) return false;
  // Base58 alphabet: no 0, O, I, l
  const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
  return base58Regex.test(address);
}

/** Status color hex values for the Killswitch theme. */
const STATUS_COLORS: Record<string, string> = {
  // Protocol status
  active: "#22c55e",
  paused: "#ef4444",
  // Threat levels
  LOW: "#22c55e",
  ELEVATED: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
  // Evaluation results
  pass: "#22c55e",
  warning: "#eab308",
  breach: "#ef4444",
};

/**
 * Maps a status/threat level/eval result to its hex color.
 * @param status - Status string (active, paused, LOW, ELEVATED, HIGH, CRITICAL, pass, warning, breach)
 * @returns Hex color string, defaults to muted gray for unknown values
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#a1a1aa";
}
