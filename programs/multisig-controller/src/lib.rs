/**
 *
 * Multi-sig vote controller. Handle voting based on a selection of keys, can use
 * reputation as a add on in later implementations.
 *
 */
use anchor_lang::prelude::*;

declare_id!("a2mscRXReHpSr44YPgHSedpyvgExTdiDufHqcFNmZWx");

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod multisig_controller {
    use super::*;

    pub fn initialize_multisig_config_v0(
        ctx: Context<InitializeMultisigConfigV0>,
        args: InitializeMultisigArgsV0,
    ) -> Result<()> {
        initialize_multisig_config_v0::handler(ctx, args)
    }

    pub fn vote_v0(ctx: Context<VoteV0>, args: VoteV0Args) -> Result<()> {
        vote_v0::handler(ctx, args)
    }

    pub fn relinquish_vote_v0(ctx: Context<RelinquishVoteV0>) -> Result<()> {
        relinquish_vote_v0::handler(ctx)
    }
}
