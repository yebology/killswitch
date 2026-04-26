import type { Invariant } from "./invariant";

/** A Solana protocol registered for Killswitch monitoring. */
export interface Protocol {
  id: string;
  program_address: string;
  name: string;
  guardian_wallet: string;
  telegram_chat_id: string;
  status: "active" | "paused";
  created_at: string;
  invariants?: Invariant[];
}
