use crate::resolution_setting_seeds;
use crate::state::*;
use anchor_lang::prelude::*;
use proposal::ProposalConfigV0;
use proposal::ProposalState;
use proposal::ProposalV0;
use proposal::{
    cpi::{accounts::UpdateStateV0, update_state_v0},
    UpdateStateArgsV0,
};

#[derive(Accounts)]
pub struct ResolveV0<'info> {
    #[account(mut)]
    pub state_controller: Account<'info, ResolutionSettingsV0>,
    #[account(
    mut,
    owner = proposal_program.key(),
    has_one = proposal_config,
    constraint = match &proposal.state {
      ProposalState::Voting { .. } => true,
      ProposalState::Custom { name, .. } => name == "Ranking",
      _ => false
    }
  )]
    pub proposal: Account<'info, ProposalV0>,
    #[account(
    has_one = state_controller,
  )]
    pub proposal_config: Account<'info, ProposalConfigV0>,
    /// CHECK: Checked via `owner` on proposal
    pub proposal_program: AccountInfo<'info>,
}

pub fn handler(ctx: Context<ResolveV0>) -> Result<()> {
    let proposal = ctx.accounts.proposal.clone().into_inner();
    if let Some(resolution) = ctx
        .accounts
        .state_controller
        .settings
        .iter()
        .find(|item|  proposal.state == item.state.clone().into())
        .unwrap()
        .resolution(&proposal)
    {
       let new_state = match resolution.next_state {
                StratProposalState::Resolved { .. } => ProposalState::Resolved { choices: resolution.choices, end_ts: Clock::get()?.unix_timestamp },
                StratProposalState::Voting { .. } => ProposalState::Voting { start_ts: Clock::get()?.unix_timestamp },
                _ => panic!(),
           };

        update_state_v0(
            CpiContext::new_with_signer(
                ctx.accounts.proposal_program.to_account_info().clone(),
                UpdateStateV0 {
                    state_controller: ctx.accounts.state_controller.to_account_info().clone(),
                    proposal: ctx.accounts.proposal.to_account_info().clone(),
                    proposal_config: ctx.accounts.proposal_config.to_account_info().clone(),
                },
                &[resolution_setting_seeds!(ctx.accounts.state_controller)],
            ),
            UpdateStateArgsV0 {
                new_state
            },
        )?;
    }

    Ok(())
}
