use crate::{error::ErrorCode, multisig_config_seeds, state::*};
use anchor_lang::prelude::*;
use proposal::{ProposalConfigV0, ProposalV0};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct VoteV0Args {
    pub choice: u16,
}

#[derive(Accounts)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = multisig_config.members.iter().any(|member| voter.key() == *member)
    )]
    pub voter: Signer<'info>,
    // Removing this as signer not needed unless in proxy voter
    /// CHECK: asserted in contraint
    pub vote_controller: AccountInfo<'info>,

    #[account()]
    pub multisig_config: Account<'info, MultisigConfigV0>,

    #[account(
        init_if_needed,
        payer = payer,
        space = VoteRecordV0::space(),
        // Could we add the rpopsoal state in here so we record state specific votes?
        seeds = [b"vote-record", proposal.key().as_ref(), voter.key().as_ref()],
        bump
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

pub fn handler(ctx: Context<VoteV0>, args: VoteV0Args) -> Result<()> {
    let voted_at = Clock::get().unwrap().unix_timestamp;

    // If vote account does not exists create it with no vote
    if ctx.accounts.vote_record.voter.eq(&Pubkey::default()) {
        ctx.accounts.vote_record.set_inner(VoteRecordV0 {
            voter: ctx.accounts.voter.key(),
            proposal: ctx.accounts.proposal.key(),
            choice: None,
            bump: ctx.bumps["vote_record"],
            voted_at: 0,
        })
    }

    require!(
        ctx.accounts.vote_record.choice.is_none(),
        ErrorCode::AlreadyVoted
    );

    ctx.accounts.vote_record.choice = Some(args.choice);
    ctx.accounts.vote_record.voted_at = voted_at;

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
                remove_vote: false,
                // Choice should we allow multiple for multisig. prob
                choice: args.choice,
                weight: 1,
            },
        )?;
    }

    Ok(())
}
