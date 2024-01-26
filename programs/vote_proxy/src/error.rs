use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("This feature has not been implement.")]
    FeatureNotImplemented,
}
