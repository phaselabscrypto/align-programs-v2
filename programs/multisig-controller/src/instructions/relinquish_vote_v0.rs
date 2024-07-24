use crate::{error::ErrorCode, multisig_config_seeds, state::*};
use anchor_lang::prelude::*;
use proposal::{ProposalConfigV0, ProposalV0};

#[derive(Accounts)]
pub struct RelinquishVoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account()]
    pub voter: Signer<'info>,
    #[account()]
    pub multisig_config: Account<'info, MultisigConfigV0>,
    // Removing this as signer not needed unless in proxy voter
    /// CHECK: asserted in contraint
    pub vote_controller: AccountInfo<'info>,

    #[account(
        mut,
        constraint = vote_record.proposal == proposal.key(),
        has_one = voter,
        // Could we add the rpopsoal state in here so we record state specific votes?
        seeds = [b"vote-record", proposal.key().as_ref(), voter.key().as_ref()],
        bump = vote_record.bump
    )]
    pub vote_record: Account<'info, VoteRecordV0>,
    #[account(
        mut,
        has_one = proposal_config,
        owner = proposal_program.key(),
    )]
    pub proposal: Account<'info, ProposalV0>,
    #[account(
        has_one = on_vote_hook,
        has_one = state_controller,
        has_one = vote_controller,
        constraint = proposal_config.vote_controller == multisig_config.key(),
        owner = proposal_program.key()
    )]
    pub proposal_config: Account<'info, ProposalConfigV0>,
    /// CHECK: Checked via cpi
    #[account(mut)]
    pub state_controller: AccountInfo<'info>,
    /// CHECK: Checked via has_one
    pub on_vote_hook: AccountInfo<'info>,
    /// CHECK: Checked via constraint
    #[account(
    constraint = *proposal.to_account_info().owner == proposal_program.key()
    )]
    pub proposal_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RelinquishVoteV0>) -> Result<()> {
    require!(
        ctx.accounts.vote_record.choice.is_some(),
        ErrorCode::NoVoteForThisChoice
    );

    if ctx.accounts.multisig_config.use_reputation {
        // Not implemented yet
        panic!()
    } else {
        proposal::cpi::vote_v0(
            CpiContext::new_with_signer(
                ctx.accounts.proposal_program.to_account_info(),
                proposal::cpi::accounts::VoteV0 {
                    voter: ctx.accounts.voter.to_account_info(),
                    vote_controller: ctx.accounts.vote_controller.to_account_info(),
                    state_controller: ctx.accounts.state_controller.to_account_info(),
                    proposal_config: ctx.accounts.proposal_config.to_account_info(),
                    proposal: ctx.accounts.proposal.to_account_info(),
                    on_vote_hook: ctx.accounts.on_vote_hook.to_account_info(),
                },
                &[multisig_config_seeds!(ctx.accounts.multisig_config)],
            ),
            proposal::VoteArgsV0 {
                remove_vote: true,
                choice: ctx.accounts.vote_record.choice.unwrap(),
                weight: 1,
            },
        )?;
    }

    ctx.accounts.vote_record.choice = None;
    ctx.accounts.vote_record.voted_at = 0i64;

    Ok(())
}
