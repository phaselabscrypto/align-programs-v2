use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod metaplex;
pub mod state;

use instructions::*;

declare_id!("a2grdoc6VNAxZ5TrbGUR1bvH6Z1AewtuwmbM8573Wis");

#[program]
pub mod org_nft_guard {
    use super::*;

    pub fn initialize_guard_v0(
        ctx: Context<InitializeGuardV0>,
        args: InitializeGuardArgsV0,
    ) -> Result<()> {
        initialize_guard_v0::handler(ctx, args)
    }

    pub fn initialize_proposal_v0(
        ctx: Context<InitializeProposalV0>,
        args: InitializeProposalArgsV0,
    ) -> Result<()> {
        initialize_proposal_v0::handler(ctx, args)
    }
}
