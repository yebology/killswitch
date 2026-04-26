use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::register_protocol::*;
use instructions::add_invariant::*;
use instructions::remove_invariant::*;
use instructions::update_config::*;
use instructions::trigger_pause::*;
use instructions::resume::*;
use state::invariant_rule::{InvariantAction, InvariantType};

declare_id!("8uSSf1TnE6Bqz1qGt3uZVAwU5Za9f1Sgp7sxtBQJ5HyJ");

#[program]
pub mod guardian {
    use super::*;

    pub fn register_protocol(
        ctx: Context<RegisterProtocol>,
        program_address: Pubkey,
        sentinel_key: Pubkey,
    ) -> Result<()> {
        instructions::register_protocol::handler(ctx, program_address, sentinel_key)
    }

    pub fn add_invariant(
        ctx: Context<AddInvariant>,
        invariant_type: InvariantType,
        threshold: u64,
        time_window: u32,
        action: InvariantAction,
    ) -> Result<()> {
        instructions::add_invariant::handler(ctx, invariant_type, threshold, time_window, action)
    }

    pub fn remove_invariant(ctx: Context<RemoveInvariant>) -> Result<()> {
        instructions::remove_invariant::handler(ctx)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_guardian_key: Option<Pubkey>,
        new_sentinel_key: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_config::handler(ctx, new_guardian_key, new_sentinel_key)
    }

    pub fn trigger_pause(ctx: Context<TriggerPause>) -> Result<()> {
        instructions::trigger_pause::handler(ctx)
    }

    pub fn resume(ctx: Context<Resume>) -> Result<()> {
        instructions::resume::handler(ctx)
    }
}
