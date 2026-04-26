use anchor_lang::prelude::*;
use crate::state::protocol_config::*;
use crate::state::invariant_rule::*;
use crate::constants::*;
use crate::error::GuardianError;

#[derive(Accounts)]
pub struct AddInvariant<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, protocol_config.program_address.as_ref()],
        bump,
        constraint = protocol_config.guardian_key == guardian.key() @ GuardianError::Unauthorized,
        constraint = protocol_config.invariant_count < MAX_INVARIANTS_PER_PROTOCOL @ GuardianError::MaxInvariantsReached,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = guardian,
        space = InvariantRule::LEN,
        seeds = [
            INVARIANT_RULE_SEED,
            protocol_config.key().as_ref(),
            &[protocol_config.invariant_count]
        ],
        bump
    )]
    pub invariant_rule: Account<'info, InvariantRule>,

    #[account(mut)]
    pub guardian: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Create a new InvariantRule PDA and increment invariant_count
pub fn handler(
    ctx: Context<AddInvariant>,
    invariant_type: InvariantType,
    threshold: u64,
    time_window: u32,
    action: InvariantAction,
) -> Result<()> {
    require!(threshold > 0, GuardianError::InvalidThreshold);
    require!(time_window > 0, GuardianError::InvalidTimeWindow);

    let config = &mut ctx.accounts.protocol_config;
    let rule = &mut ctx.accounts.invariant_rule;

    rule.protocol_config = config.key();
    rule.invariant_type = invariant_type;
    rule.threshold = threshold;
    rule.time_window = time_window;
    rule.action = action;
    rule.enabled = true;
    rule.index = config.invariant_count;

    config.invariant_count += 1;

    Ok(())
}
