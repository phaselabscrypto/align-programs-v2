use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Mint does meet guard requirements")]
    MintNotValid,
    #[msg("The collection is either not verified or the mint does not match.")]
    CollectionVerificationFailed,
    #[msg("The weight reciprocal does not meet the Guard requirements")]
    InsufficientWeight,
}
