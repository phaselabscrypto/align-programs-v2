use crate::metaplex::MetadataAccount;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use proposal::{ProposalConfigV0, ProposalV0};

use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct VoteArgsV0 {
    pub choice: u16,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub nft_voter: Box<Account<'info, NftVoterV0>>,
    pub voter: Signer<'info>,
    pub vote_controller: Signer<'info>,
    pub proposal: Account<'info, ProposalV0>,
    #[account(
    has_one = on_vote_hook,
    has_one = state_controller,
    owner = proposal_program.key()
  )]
    pub proposal_config: Account<'info, ProposalConfigV0>,
    /// CHECK: Checked in cpi
    pub rep_config: UncheckedAccount<'info>,
    /// CHECK: Checked in cpi
    pub receipt: UncheckedAccount<'info>,
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
    ///CHECK checked address
    #[account(
      executable,
      address = reputation::id()
    )]
    pub reputation_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<VoteV0>, args: VoteArgsV0) -> Result<()> {
    reputation::cpi::vote_v0(
        CpiContext::new(
            ctx.accounts.reputation_program.to_account_info(),
            reputation::cpi::accounts::VoteV0 {
                payer: ctx.accounts.payer.to_account_info(),
                voter: ctx.accounts.voter.to_account_info(),
                rep_config: ctx.accounts.rep_config.to_account_info(),
                vote_controller: ctx.accounts.vote_controller.to_account_info(),
                receipt: ctx.accounts.receipt.to_account_info(),
                proposal: ctx.accounts.proposal.to_account_info(),
                proposal_config: ctx.accounts.proposal_config.to_account_info(),
                state_controller: ctx.accounts.state_controller.to_account_info(),
                on_vote_hook: ctx.accounts.on_vote_hook.to_account_info(),
                proposal_program: ctx.accounts.proposal_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ),
        reputation::RepVoteArgsV0 {
            choice: args.choice,
            amount: args.amount,
        },
    )?;

    Ok(())
}
