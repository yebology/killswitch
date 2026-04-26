use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ProtocolStatus {
    Active,
    Paused,
}

#[account]
pub struct ProtocolConfig {
    /// Pubkey of the Solana program being protected
    pub program_address: Pubkey,
    /// Pubkey of the guardian wallet (full authority: register, add/remove invariant, update config, resume)
    pub guardian_key: Pubkey,
    /// Pubkey of the sentinel service (limited authority: trigger_pause)
    pub sentinel_key: Pubkey,
    /// Protocol status: Active or Paused
    pub status: ProtocolStatus,
    /// Unix timestamp when ProtocolConfig was created
    pub created_at: i64,
    /// Number of registered invariant rules (0..MAX_INVARIANTS_PER_PROTOCOL)
    pub invariant_count: u8,
}

impl ProtocolConfig {
    /// Space: 8 (discriminator) + 32 + 32 + 32 + 1 + 8 + 1 = 114 bytes
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 1;
}
