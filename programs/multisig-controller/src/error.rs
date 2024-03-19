use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Already voted for this proposal")]
    AlreadyVoted,
    #[msg("No vote to relinquish for this choice")]
    NoVoteForThisChoice,
}
