use crate::error::ErrorCode;
use crate::initialize_proposal_base_v0::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeProposalByWalletV0<'info> {
    pub initialize_proposal_base: InitializeProposalBaseV0<'info>,

    proposer: Signer<'info>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeProposalByWalletV0<'info>>,
    args: InitializeProposalArgsV0,
) -> Result<()> {
    let base = &ctx.accounts.initialize_proposal_base;

    let config = match &base.guard.guard_type {
        GuardType::WalletList { guard_data } => guard_data
            .iter()
            .find(|config| config.address == ctx.accounts.proposer.key())
            .ok_or(ErrorCode::ProposerNotValid)
            .cloned(),
        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if config.multiplier > 0 {
        cpi_initialize_proposal(&base, args)
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}
