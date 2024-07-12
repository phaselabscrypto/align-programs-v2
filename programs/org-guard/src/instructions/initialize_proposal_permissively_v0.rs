use crate::error::ErrorCode;
use crate::initialize_proposal_base_v0::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeProposalPermissivelyV0<'info> {
    pub initialize_proposal_base: InitializeProposalBaseV0<'info>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeProposalPermissivelyV0<'info>>,
    args: InitializeProposalArgsV0,
) -> Result<()> {
    let base = &ctx.accounts.initialize_proposal_base;

    match base.guard.guard_type {
        GuardType::Permissive => cpi_initialize_proposal(&base, args),
        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }
}
