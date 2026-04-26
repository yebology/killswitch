use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::constants::*;
use crate::error::GuardianError;

#[derive(Accounts)]
pub struct TriggerPause<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, protocol_config.program_address.as_ref()],
        bump,
        constraint = protocol_config.sentinel_key == sentinel.key() @ GuardianError::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub sentinel: Signer<'info>,
}

/// Set protocol status to Paused and emit a log message
pub fn handler(ctx: Context<TriggerPause>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;

    require!(
        config.status != ProtocolStatus::Paused,
        GuardianError::AlreadyPaused
    );

    config.status = ProtocolStatus::Paused;

    msg!(
        "Protocol {} paused by sentinel {}",
        config.program_address,
        ctx.accounts.sentinel.key()
    );

    Ok(())
}
