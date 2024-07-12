use crate::error::ErrorCode;
use crate::initialize_proposal_base_v0::*;
use crate::metaplex::MetadataAccount;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct InitializeProposalByNftV0<'info> {
    pub initialize_proposal_base: InitializeProposalBaseV0<'info>,

    pub proposer: Signer<'info>,
    #[account(
        seeds = [
            "metadata".as_bytes(),
            MetadataAccount::owner().as_ref(),
            token_account.mint.as_ref(),
        ],
        seeds::program = MetadataAccount::owner(),
        bump,
    )]
    pub metadata: Account<'info, MetadataAccount>,
    #[account(
        token::authority = proposer,
    )]
    pub token_account: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeProposalByNftV0<'info>>,
    args: InitializeProposalArgsV0,
) -> Result<()> {
    let base = &ctx.accounts.initialize_proposal_base;

    assert_sufficient_weight(
        &base.guard.guard_type,
        &ctx.accounts.metadata,
        &ctx.accounts.token_account,
    )?;

    cpi_initialize_proposal(&base, args)
}

fn assert_sufficient_weight(
    guard_type: &GuardType,
    metadata: &MetadataAccount,
    token: &TokenAccount,
) -> Result<()> {
    let config = match guard_type {
        GuardType::CollectionMint { guard_data } => metadata
            .collection
            .as_ref()
            .filter(|col| col.verified)
            .and_then(|col| {
                guard_data
                    .iter()
                    .find(|config| config.address == col.key)
                    .cloned()
            })
            .ok_or(ErrorCode::CollectionVerificationFailed),
        GuardType::FirstCreatorAddress { guard_data } => metadata
            .data
            .creators
            .as_ref()
            .and_then(|creators| creators.iter().find(|creator| creator.verified))
            .and_then(|first_creator| {
                guard_data
                    .iter()
                    .find(|config| config.address == first_creator.address)
                    .cloned()
            })
            .ok_or(ErrorCode::FirstCreatorAddressVerificationFailed),
        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if token.amount > 0 && config.multiplier > 0 {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}
