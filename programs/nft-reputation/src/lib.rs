use anchor_lang::prelude::*;

declare_id!("3mYGDQq3NM4xgJAe3khNsicsnnJwHL6kBpLTATXDiMM9");

pub mod error;
pub mod instructions;
pub mod metaplex;
pub mod state;

pub use instructions::*;

#[program]
pub mod nft_reputation {
    use super::*;

    pub fn initialize_nft_voter_v0(
        ctx: Context<InitializeNftVoterV0>,
        args: InitializeNftVoterArgsV0,
    ) -> Result<()> {
        initialize_nft_voter_v0::handler(ctx, args)
    }

    pub fn relinquish_vote_v0(
        ctx: Context<RelinquishVoteV0>,
        args: RelinquishVoteArgsV0,
    ) -> Result<()> {
        relinquish_vote_v0::handler(ctx, args)
    }

    pub fn vote_v0(ctx: Context<VoteV0>, args: VoteArgsV0) -> Result<()> {
        vote_v0::handler(ctx, args)
    }
}
