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
    /// CHECK: Checked in the program
    pub mint: AccountInfo<'info>,
    #[account(
        seeds = ["metadata".as_bytes(), MetadataAccount::owner().as_ref(), mint.key().as_ref()],
        seeds::program = MetadataAccount::owner(),
        bump
    )]
    pub metadata: Account<'info, MetadataAccount>,
    #[account(
        associated_token::authority = proposer,
        associated_token::mint = mint,
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
        GuardType::CollectionMint { guard_data } => match metadata.collection.as_ref() {
            Some(col) if col.verified => guard_data
                .iter()
                .find(|config| config.address == col.key)
                .ok_or(ErrorCode::CollectionVerificationFailed)
                .cloned(),
            _ => Err(ErrorCode::CollectionVerificationFailed.into()),
        },
        GuardType::FirstCreatorAddress { guard_data } => {
            if let Some(creators) = metadata.data.creators.as_ref() {
                if let Some(first_creator) = creators.iter().find(|creator| creator.verified) {
                    guard_data
                        .iter()
                        .find(|config| config.address == first_creator.address)
                        .ok_or(ErrorCode::FirstCreatorAddressVerificationFailed)
                        .cloned()
                } else {
                    Err(ErrorCode::FirstCreatorAddressVerificationFailed.into())
                }
            } else {
                Err(ErrorCode::FirstCreatorAddressVerificationFailed.into())
            }
        }
        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if config.multiplier as u64 >= token.amount {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}