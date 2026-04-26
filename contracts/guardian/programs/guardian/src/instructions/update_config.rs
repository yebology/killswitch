use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::constants::*;
use crate::error::GuardianError;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, protocol_config.program_address.as_ref()],
        bump,
        constraint = protocol_config.guardian_key == guardian.key() @ GuardianError::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub guardian: Signer<'info>,
}

/// Update guardian_key and/or sentinel_key on a ProtocolConfig
pub fn handler(
    ctx: Context<UpdateConfig>,
    new_guardian_key: Option<Pubkey>,
    new_sentinel_key: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;

    if let Some(key) = new_guardian_key {
        config.guardian_key = key;
    }

    if let Some(key) = new_sentinel_key {
        config.sentinel_key = key;
    }

    Ok(())
}
