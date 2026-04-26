/// Maximum number of invariant rules per protocol
pub const MAX_INVARIANTS_PER_PROTOCOL: u8 = 10;

/// Seed for ProtocolConfig PDA derivation
pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_config";

/// Seed for InvariantRule PDA derivation
pub const INVARIANT_RULE_SEED: &[u8] = b"invariant_rule";
