use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::state::invariant_rule::*;
use crate::constants::*;
use crate::error::GuardianError;

#[derive(Accounts)]
pub struct RemoveInvariant<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, protocol_config.program_address.as_ref()],
        bump,
        constraint = protocol_config.guardian_key == guardian.key() @ GuardianError::Unauthorized,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        close = guardian,
        seeds = [
            INVARIANT_RULE_SEED,
            protocol_config.key().as_ref(),
            &[invariant_rule.index]
        ],
        bump,
        constraint = invariant_rule.protocol_config == protocol_config.key(),
    )]
    pub invariant_rule: Account<'info, InvariantRule>,

    #[account(mut)]
    pub guardian: Signer<'info>,
}

/// Close an InvariantRule account and decrement invariant_count
pub fn handler(ctx: Context<RemoveInvariant>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    config.invariant_count -= 1;
    Ok(())
}
