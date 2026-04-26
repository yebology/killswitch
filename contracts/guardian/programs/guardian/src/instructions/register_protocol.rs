use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(program_address: Pubkey)]
pub struct RegisterProtocol<'info> {
    #[account(
        init,
        payer = guardian,
        space = ProtocolConfig::LEN,
        seeds = [PROTOCOL_CONFIG_SEED, program_address.as_ref()],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub guardian: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Initialize a new ProtocolConfig PDA for a protected protocol
pub fn handler(
    ctx: Context<RegisterProtocol>,
    program_address: Pubkey,
    sentinel_key: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.program_address = program_address;
    config.guardian_key = ctx.accounts.guardian.key();
    config.sentinel_key = sentinel_key;
    config.status = ProtocolStatus::Active;
    config.created_at = Clock::get()?.unix_timestamp;
    config.invariant_count = 0;
    Ok(())
}
