use crate::error::ErrorCode;
use crate::initialize_proposal_base_v0::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct InitializeProposalByTokenV0<'info> {
    pub initialize_proposal_base: InitializeProposalBaseV0<'info>,

    pub proposer: Signer<'info>,
    /// CHECK: Checked in the program
    pub mint: AccountInfo<'info>,
    #[account(
        associated_token::authority = proposer,
        associated_token::mint = mint,
    )]
    pub token_account: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeProposalByTokenV0<'info>>,
    args: InitializeProposalArgsV0,
) -> Result<()> {
    let base = &ctx.accounts.initialize_proposal_base;

    assert_sufficient_weight(
        &base.guard.guard_type,
        &ctx.accounts.mint,
        &ctx.accounts.token_account,
    )?;

    cpi_initialize_proposal(&base, args)
}

fn assert_sufficient_weight(
    guard_type: &GuardType,
    mint: &AccountInfo,
    token: &TokenAccount,
) -> Result<()> {
    let config = match guard_type {
        GuardType::MintList { guard_data } => guard_data
            .iter()
            .find(|config| config.address == mint.key())
            .ok_or(ErrorCode::MintNotValid)
            .cloned(),

        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if token.amount >= config.divisor {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}
