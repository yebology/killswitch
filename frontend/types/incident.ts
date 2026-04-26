/** A security incident triggered when an invariant rule is breached. */
export interface Incident {
  id: string;
  protocol_id: string;
  invariant_id: string;
  trigger_time: string;
  tx_hashes: string[];
  action_taken: string;
  damage_estimate: number;
  escalation_reason: string | null;
}
