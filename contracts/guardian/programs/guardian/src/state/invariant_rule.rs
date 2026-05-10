use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum InvariantType {
    WithdrawalRate,
    TvlDrop,
    AdminAction,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum InvariantAction {
    Pause,
    Alert,
}

#[account]
pub struct InvariantRule {
    /// Pubkey reference to parent ProtocolConfig PDA
    pub protocol_config: Pubkey,
    /// Type of invariant rule
    pub invariant_type: InvariantType,
    /// Threshold value (e.g., 5_000_000 for $5M withdrawal rate)
    pub threshold: u64,
    /// Time window in seconds (e.g., 60 for 1 minute)
    pub time_window: u32,
    /// Action when invariant is breached
    pub action: InvariantAction,
    /// Whether this rule is active
    pub enabled: bool,
    /// Index of this rule in the ProtocolConfig (0-based)
    pub index: u8,
}

impl InvariantRule {
    /// Space: 8 (discriminator) + 32 + 1 + 8 + 4 + 1 + 1 + 1 = 56 bytes
    pub const LEN: usize = 8 + 32 + 1 + 8 + 4 + 1 + 1 + 1;
}
