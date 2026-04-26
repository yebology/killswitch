use anchor_lang::prelude::*;

#[error_code]
pub enum GuardianError {
    #[msg("Caller is not authorized for this action")]
    Unauthorized,
    #[msg("Protocol is already paused")]
    AlreadyPaused,
    #[msg("Protocol is already active")]
    AlreadyActive,
    #[msg("Invalid invariant type or parameters")]
    InvalidInvariant,
    #[msg("Protocol has reached maximum invariant count")]
    MaxInvariantsReached,
    #[msg("Threshold must be positive")]
    InvalidThreshold,
    #[msg("Time window must be positive")]
    InvalidTimeWindow,
}
