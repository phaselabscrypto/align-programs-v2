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

    assert_sufficient_weight(&base.guard.guard_type, &ctx.accounts.proposer)?;

    cpi_initialize_proposal(&base, args)
}

fn assert_sufficient_weight(guard_type: &GuardType, proposer: &AccountInfo) -> Result<()> {
    let config = match guard_type {
        GuardType::WalletList { guard_data } => guard_data
            .iter()
            .find(|config| config.address == proposer.key())
            .ok_or(ErrorCode::ProposerNotValid)
            .cloned(),
        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if config.multiplier > 0 {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}
