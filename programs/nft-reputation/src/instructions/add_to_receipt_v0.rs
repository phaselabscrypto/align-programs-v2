use crate::{error::ErrorCode, metaplex::MetadataAccount};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use proposal::{ProposalConfigV0, ProposalV0};

use crate::{nft_voter_seeds, state::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AddToReceiptArgsV0 {
  pub choice: u16,
}
#[derive(Accounts)]
pub struct AddToReceiptV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
    init,
    payer = payer,
    space = 8 + 60 + std::mem::size_of::<VoteMarkerV0>(),
    seeds = [b"marker", nft_voter.key().as_ref(), mint.key().as_ref(), proposal.key().as_ref()],
    bump
  )]
    pub marker: Box<Account<'info, VoteMarkerV0>>,
    pub nft_voter: Box<Account<'info, NftVoterV0>>,

    pub mint: Box<Account<'info, Mint>>,
    #[account(
    seeds = ["metadata".as_bytes(), MetadataAccount::owner().as_ref(), mint.key().as_ref()],
    seeds::program = MetadataAccount::owner(),
    bump,
    constraint = metadata.collection.as_ref().map(|col|
      col.verified &&
      nft_voter.collections.iter().any(|collection_item| collection_item.mint == col.key)
  ).unwrap_or_else(|| false)  )]
    pub metadata: Box<Account<'info, MetadataAccount>>,
    #[account(
    associated_token::authority = voter,
    associated_token::mint = mint,
    constraint = token_account.amount == 1,
  )]
    pub token_account: Box<Account<'info, TokenAccount>>,

    pub voter: Signer<'info>,
    ///CHECK: Checked in cpi
    pub token_controller: UncheckedAccount<'info>,

    ///CHECK: Checked in cpi
    pub rep_config: UncheckedAccount<'info>,

    #[account(mut)]
    pub receipt: UncheckedAccount<'info>,
    ///CHECK in cpi
    pub proposal: UncheckedAccount<'info>,
    #[account(
    executable,
    address = reputation::id()
  )]
    pub reputation_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddToReceiptV0>) -> Result<()> {

  let marker = &mut ctx.accounts.marker;
  marker.proposal = ctx.accounts.proposal.key();
  marker.bump_seed = ctx.bumps["marker"];
  marker.voter = ctx.accounts.voter.key();
  marker.nft_voter = ctx.accounts.nft_voter.key();
  marker.mint = ctx.accounts.mint.key();


    reputation::cpi::add_to_receipt(
        CpiContext::new_with_signer(
            ctx.accounts.reputation_program.to_account_info(),
            reputation::cpi::accounts::AddToReceiptV0 {
                payer: ctx.accounts.payer.to_account_info(),
                voter: ctx.accounts.voter.to_account_info(),
                rep_config: ctx.accounts.rep_config.to_account_info(),
                receipt: ctx.accounts.receipt.to_account_info(),
                proposal: ctx.accounts.proposal.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_controller: ctx.accounts.token_controller.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
            &[nft_voter_seeds!(ctx.accounts.nft_voter)],
        ),
        reputation::AddToReceiptArgsV0 { amount: 1},
    )?;

    Ok(())
}
