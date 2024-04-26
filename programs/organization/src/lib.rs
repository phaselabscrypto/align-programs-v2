use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("a2orghRV2Bj2fyqFQtYeBZ9972raZyrvXVf5tQ9jYMK");

#[program]
pub mod organization {
    use super::*;

    pub fn initialize_organization_v0(
        ctx: Context<InitializeOrganizationV0>,
        args: InitializeOrganizationArgsV0,
    ) -> Result<()> {
        initialize_organization_v0::handler(ctx, args)
    }

    pub fn initialize_proposal_v0(
        ctx: Context<InitializeProposalV0>,
        args: InitializeProposalArgsV0,
    ) -> Result<()> {
        initialize_proposal_v0::handler(ctx, args)
    }

    pub fn update_organization_v0(
        ctx: Context<UpdateOrganizationV0>,
        args: UpdateOrganizationArgsV0,
    ) -> Result<()> {
        update_organization_v0::handler(ctx, args)
    }
}
