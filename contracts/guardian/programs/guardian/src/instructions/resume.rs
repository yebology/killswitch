use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::constants::*;
use crate::error::GuardianError;

#[derive(Accounts)]
pub struct Resume<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, protocol_config.program_address.as_ref()],
        bump,
        constraint = protocol_config.guardian_key == guardian.key() @ GuardianError::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub guardian: Signer<'info>,
}

/// Set protocol status to Active and emit a log message
pub fn handler(ctx: Context<Resume>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;

    require!(
        config.status != ProtocolStatus::Active,
        GuardianError::AlreadyActive
    );

    config.status = ProtocolStatus::Active;

    msg!(
        "Protocol {} resumed by guardian {}",
        config.program_address,
        ctx.accounts.guardian.key()
    );

    Ok(())
}
