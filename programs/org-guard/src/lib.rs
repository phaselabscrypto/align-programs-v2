use std::default;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use metaplex::MetadataAccount;
use organization::{instructions::InitializeProposalArgsV0, state::OrganizationV0};

declare_id!("H6TVRAz1aQdEENcJDzo7qLVtnChNRWnXeEehZ96MYuM2");
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeGuardArgsV0 {
    pub name: String,
    pub guard_type: GuardType,
    pub authority: Pubkey,
}
mod error;
mod metaplex;
pub use error::ErrorCode;
#[program]
pub mod org_nft_guard {
    use super::*;

    pub fn initialize_guard_v0(
        ctx: Context<InitializeGuardV0>,
        args: InitializeGuardArgsV0,
    ) -> Result<()> {
        ctx.accounts.nft_guard.set_inner(GuardV0 {
            name: args.name,
            authority: args.authority,
            guard_type: args.guard_type,
        });

        Ok(())
    }

    pub fn intialize_proposal_v0(
        ctx: Context<InitializeProposalV0>,
        args: InitializeProposalArgsV0,
    ) -> Result<()> {
        let metadata = ctx.accounts.metadata.clone();
        ctx.accounts.guard.assert_is_valid_token(&metadata)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: InitializeGuardArgsV0)]

pub struct InitializeGuardV0<'info> {
    /// CHECK: Payer
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
      init,
      payer = payer,
      space = 8 + 80 + GuardV0::INIT_SPACE,
      seeds = [b"nft_guard", args.name.as_bytes()],
      bump
    )]
    pub nft_guard: Box<Account<'info, GuardV0>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: InitializeProposalArgsV0)]
pub struct InitializeProposalV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub proposer: Signer<'info>,
    pub guard: Account<'info, GuardV0>,
    /// CHECK: Setting this account, does not need a check. Putting here instead of args to save tx space
    pub owner: UncheckedAccount<'info>,
    #[account(
      mut,
      seeds = [
        b"proposal",
        organization.key().as_ref(),
        &organization.num_proposals.to_le_bytes()[..]
      ],
      seeds::program = organization.proposal_program,
      bump,
    )]
    /// CHECK: Checked via cpi
    pub proposal: AccountInfo<'info>,
    /// CHECK: Checked via cpi
    pub proposal_config: AccountInfo<'info>,
    #[account(
      mut,
      has_one = proposal_program,
      has_one = guard
    )]
    pub organization: Box<Account<'info, OrganizationV0>>,

    pub mint: Box<Account<'info, Mint>>,
    #[account(
        seeds = ["metadata".as_bytes(), MetadataAccount::owner().as_ref(), mint.key().as_ref()],
        seeds::program = MetadataAccount::owner(),
        bump
    )]
    pub metadata: Account<'info, MetadataAccount>,
    #[account(
        associated_token::authority = proposer,
        associated_token::mint = mint,
        constraint = token_account.amount == 1,
  )]
    pub token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: Checked via address constraint
    #[account(
    address = organization.proposal_program
  )]
    pub proposal_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum GuardType {
    CollectionMint { mints: [Pubkey; 8] },
    FirstCreatorAddress { addresses: [Pubkey; 8] },
    // This is not implemented yet
    MintList { mints: [Pubkey; 8] },
}

#[account]
#[derive(InitSpace)]
pub struct GuardV0 {
    #[max_len(32)]
    pub name: String,
    pub authority: Pubkey,
    pub guard_type: GuardType,
}

impl GuardV0 {
    pub fn assert_is_valid_token(&self, metadata: &MetadataAccount) -> Result<()> {
        match self.guard_type {
            GuardType::CollectionMint { mints } => {
                match metadata.collection.as_ref() {
                    Some(col)
                        if col.verified
                            && mints
                                .iter()
                                .any(|collection_item| collection_item == &col.key) =>
                    {
                        // If the collection is verified and the key matches one of the mints, return Ok(())
                        Ok(())
                    }
                    _ => {
                        // If the collection is not verified or the key doesn't match, return an error
                        Err(ErrorCode::CollectionVerificationFailed.into())
                    }
                }
            }
            GuardType::FirstCreatorAddress { addresses } => {
                if let Some(first_creator) =
                    metadata.data.creators.as_ref().unwrap().into_iter().next()
                {
                    // Check if the first creator's address is in the list of addresses provided
                    if addresses
                        .iter()
                        .any(|address| *address == first_creator.address)
                    {
                        Ok(())
                    } else {
                        Err(ErrorCode::MintNotValid.into())
                    }
                } else {
                    Err(ErrorCode::MintNotValid.into())
                }
            }
            GuardType::MintList { mints } => todo!(),
        }
    }
}
