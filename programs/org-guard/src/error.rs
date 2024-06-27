use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Mint does meet guard requirements")]
    MintNotValid,
    #[msg("The collection is either not verified or the mint does not match")]
    CollectionVerificationFailed,
    #[msg("The asset does not have enough weight to meet guard requirements")]
    InsufficientWeight,
    #[msg("The first verified creator address does not meet guard requirements")]
    FirstCreatorAddressVerificationFailed,
    #[msg("The proposer does meet guard requirements")]
    ProposerNotValid,
    #[msg("The instruction is not allowed for this guard")]
    InstructionNotAllowed,
}
