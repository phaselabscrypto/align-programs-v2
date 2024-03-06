use crate::{error::ErrorCode, metaplex::MetadataAccount};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use proposal::{ProposalConfigV0, ProposalV0};

use crate::{nft_voter_seeds, state::*};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct VoteArgsV0 {
  pub choice: u16,
}
#[derive(Accounts)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
    init_if_needed,
    payer = payer,
    space = 8 + 60 + std::mem::size_of::<VoteMarkerV0>(),
    seeds = [b"marker", nft_voter.key().as_ref(), mint.key().as_ref(), proposal.key().as_ref()],
    bump
  )]
    pub marker: Box<Account<'info, VoteMarkerV0>>,
    pub nft_voter: Box<Account<'info, NftVoterV0>>,
    pub voter: Signer<'info>,
    pub vote_controller: Signer<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(
    seeds = ["metadata".as_bytes(), MetadataAccount::owner().as_ref(), mint.key().as_ref()],
    seeds::program = MetadataAccount::owner(),
    bump,
    constraint = metadata.collection.as_ref().map(|col| 
      col.verified && 
      nft_voter.collections.iter().any(|collection_item| collection_item.mint == col.key)
  ).unwrap_or_else(|| false)
  
  )]
    pub metadata: Box<Account<'info, MetadataAccount>>,
    #[account(
    associated_token::authority = voter,
    associated_token::mint = mint,
    constraint = token_account.amount == 1,
  )]
    pub token_account: Box<Account<'info, TokenAccount>>,
    #[account(
    mut,
    has_one = proposal_config,
    owner = proposal_program.key(),
  )]
    pub proposal: Account<'info, ProposalV0>,
    #[account(
    has_one = on_vote_hook,
    has_one = state_controller,
    owner = proposal_program.key()
  )]
    pub proposal_config: Account<'info, ProposalConfigV0>,
    /// CHECK: Checked via cpi
    #[account(mut)]
    pub state_controller: Signer<'info>,
    /// CHECK: Checked via has_one
    pub on_vote_hook: AccountInfo<'info>,
    /// CHECK: Checked via constraint
    #[account(
    constraint = *proposal.to_account_info().owner == proposal_program.key()
  )]
    pub proposal_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VoteV0>, args: VoteArgsV0) -> Result<()> {
    msg!("I started");
    let marker = &mut ctx.accounts.marker;
    marker.proposal = ctx.accounts.proposal.key();
    marker.bump_seed = ctx.bumps["marker"];
    marker.voter = ctx.accounts.voter.key();
    marker.nft_voter = ctx.accounts.nft_voter.key();
    marker.mint = ctx.accounts.mint.key();

    msg!("I set");
    // Don't allow voting for the same choice twice.
    require!(
        marker.choices.iter().all(|choice| *choice != args.choice),
        ErrorCode::AlreadyVoted
    );
    require_gt!(
        ctx.accounts.proposal.max_choices_per_voter,
        marker.choices.len() as u16,
        ErrorCode::MaxChoicesExceeded
    );

    marker.choices.push(args.choice);
    msg!("I vote");

    Ok(())
}
