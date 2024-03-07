use std::mem;

use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use proposal::{ProposalConfigV0, ProposalV0};

pub mod error;
use error::ErrorCode;

declare_id!("E6qW37nUQgCcqWxwjSkpeAfJeW17YzFbdrEtVrGPMExM");
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeRepConfigArgsV0 {
    authority: Pubkey,
    name: String,
    pub voting_rep_reward: u8,
    pub voting_in_alignment_reward: u8,
    pub proposal_success_reward: u8,
    pub token_controller: Pubkey,

    /*
        Whether you require an nft to do any actions in the DAO
        if false and the user has some min_reputation earnt within the DAO
        they can still interact in the DAO
    */
    pub token_required: bool,
    /*
        Minimum reputation needed to create proposals
    */
    pub proposal_min_reputation_gate: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct RepVoteArgsV0 {
    pub choice: u16,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct AddToReceiptArgsV0 {
    pub amount: u64,
}

#[program]
pub mod reputation {
    use super::*;

    pub fn initialize_rep_voter_v0(
        ctx: Context<InitializeRepConfigV0>,
        args: InitializeRepConfigArgsV0,
    ) -> Result<()> {
        ctx.accounts.rep_config.set_inner(ReputationConfigV0 {
            authority: args.authority,
            name: args.name,
            voting_in_alignment_reward: args.voting_in_alignment_reward,
            voting_rep_reward: args.voting_rep_reward,
            proposal_success_reward: args.proposal_success_reward,
            token_required: args.token_required,
            token_controller: args.token_controller,
            bump: ctx.bumps["rep_config"],
        });

        Ok(())
    }

    pub fn add_to_receipt(ctx: Context<AddToReceiptV0>, args: AddToReceiptArgsV0) -> Result<()> {
        if ctx.accounts.receipt.to_account_infos().is_empty() {
            ctx.accounts.receipt.set_inner(ReceiptV0 {
                voter: ctx.accounts.voter.key(),
                rep_voter: ctx.accounts.rep_config.key(),
                proposal: ctx.accounts.proposal.key(),
                amount: 0,
                num_active_votes: 0,
                bump_seed: ctx.bumps["receipt"],
                choices: vec![],
            });
        }
        // let receipt = &mut ctx.accounts.receipt;

        // if receipt.choices.iter().all(|choice| *choice != args.choice) {
        //     receipt.choices.push(args.choice);
        // }

        // require_gt!(
        //     ctx.accounts.proposal.max_choices_per_voter,
        //     receipt.choices.len() as u16,
        //     ErrorCode::MaxChoicesExceeded
        // );

        ctx.accounts.receipt.amount = ctx
            .accounts
            .receipt
            .amount
            .checked_add(args.amount)
            .unwrap();

        Ok(())
    }

    pub fn vote_v0(ctx: Context<VoteV0>, args: RepVoteArgsV0) -> Result<()> {
        require_gte!(
            ctx.accounts.receipt.amount,
            ctx.accounts
                .receipt
                .num_active_votes
                .checked_add(args.amount)
                .unwrap(),
            ErrorCode::VoteAmountExceeded
        );

        if ctx.accounts.receipt.choices.len() == 0 {
            ctx.accounts.receipt.choices = vec![args.choice];
        } else {
            require_eq!(
                args.choice,
                ctx.accounts.receipt.choices.pop().unwrap(),
                ErrorCode::VoteAmountExceeded
            );
        }

        proposal::cpi::vote_v0(
            CpiContext::new(
                ctx.accounts.proposal_program.to_account_info(),
                proposal::cpi::accounts::VoteV0 {
                    voter: ctx.accounts.voter.to_account_info(),
                    vote_controller: ctx.accounts.vote_controller.to_account_info(),
                    state_controller: ctx.accounts.state_controller.to_account_info(),
                    proposal_config: ctx.accounts.proposal_config.to_account_info(),
                    proposal: ctx.accounts.proposal.to_account_info(),
                    on_vote_hook: ctx.accounts.on_vote_hook.to_account_info(),
                },
            ),
            proposal::VoteArgsV0 {
                remove_vote: false,
                choice: args.choice,
                weight: u128::from(args.amount),
            },
        )?;

        ctx.accounts.receipt.num_active_votes = ctx
            .accounts
            .receipt
            .num_active_votes
            .checked_add(args.amount)
            .unwrap();

        Ok(())
    }
    pub fn relinquish_vote_v0(ctx: Context<VoteV0>, args: RepVoteArgsV0) -> Result<()> {
        require_gte!(
            0,
            ctx.accounts
                .receipt
                .num_active_votes
                .checked_sub(args.amount)
                .unwrap(),
            ErrorCode::VoteAmountExceeded
        );
        require!(
            ctx.accounts.receipt.choices.len() == 1,
            ErrorCode::VoteAmountExceeded
        );

        proposal::cpi::vote_v0(
            CpiContext::new(
                ctx.accounts.proposal_program.to_account_info(),
                proposal::cpi::accounts::VoteV0 {
                    voter: ctx.accounts.voter.to_account_info(),
                    vote_controller: ctx.accounts.vote_controller.to_account_info(),
                    state_controller: ctx.accounts.state_controller.to_account_info(),
                    proposal_config: ctx.accounts.proposal_config.to_account_info(),
                    proposal: ctx.accounts.proposal.to_account_info(),
                    on_vote_hook: ctx.accounts.on_vote_hook.to_account_info(),
                },
            ),
            proposal::VoteArgsV0 {
                remove_vote: true,
                choice: args.choice,
                weight: u128::from(args.amount),
            },
        )?;

        ctx.accounts.receipt.num_active_votes = ctx
            .accounts
            .receipt
            .num_active_votes
            .checked_sub(args.amount)
            .unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: InitializeRepConfigArgsV0)]
pub struct InitializeRepConfigV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
      init,
      payer = payer,
      space = ReputationConfigV0::space(&args.name),
      seeds = [b"rep_config", args.name.as_bytes()],
      bump
    )]
    pub rep_config: Box<Account<'info, ReputationConfigV0>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: AddToReceiptArgsV0)]
pub struct AddToReceiptV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub voter: Signer<'info>,
    #[account(
        address = rep_config.token_controller
    )]
    pub token_controller: Signer<'info>,
    #[account(
        seeds = [b"rep_config", rep_config.name.as_bytes()],
        bump
      )]
    pub rep_config: Box<Account<'info, ReputationConfigV0>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = ReceiptV0::space(),
        seeds = [b"receipt", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub receipt: Box<Account<'info, ReceiptV0>>,
    ///CHECK in cpi
    pub proposal: Account<'info, ProposalV0>,

    pub mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: RepVoteArgsV0)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub voter: Signer<'info>,

    #[account(
      seeds = [b"rep_config", rep_config.name.as_bytes()],
      bump
    )]
    pub rep_config: Box<Account<'info, ReputationConfigV0>>,
    pub vote_controller: Signer<'info>,

    #[account(
        mut,
       constraint = receipt.proposal == proposal.key(),
       constraint = receipt.voter == voter.key(),
    )]
    pub receipt: Box<Account<'info, ReceiptV0>>,
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

#[account]
pub struct ReputationConfigV0 {
    pub authority: Pubkey,
    pub name: String,
    pub token_controller: Pubkey,
    pub voting_rep_reward: u8,
    pub voting_in_alignment_reward: u8,
    pub proposal_success_reward: u8,

    /*
        Whether you require an nft to do any voting in the DAO
        if false and the user has some min_reputation earnt within the DAO
        they can still interact in the DAO
    */
    pub token_required: bool,
    pub bump: u8,
}

impl ReputationConfigV0 {
    pub fn space(name: &str) -> usize {
        8 + 32 + 4 + name.len() + 1 + 1 + 1 + 1 + std::mem::size_of::<Option<Pubkey>>() + 1
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Debug, Default)]
pub struct ContributionReputationV0 {
    pub proposal_votes: u64,
    pub proposal_votes_in_alignment: u64,
    pub proposals_created_failed: u64,
    pub proposals_created_success: u64,
}

#[account]
pub struct ReputationManagerV0 {
    pub namespace: Pubkey,
    pub repuation_config: Pubkey,
    pub wallet: Pubkey,
    pub reputation: ContributionReputationV0,
    pub bump: u8,
}

impl ReputationManagerV0 {
    pub fn space() -> usize {
        8 + 32 + 32 + 32 + mem::size_of::<ContributionReputationV0>()
    }
}

#[account]
pub struct ReceiptV0 {
    pub voter: Pubkey,
    pub rep_voter: Pubkey,
    pub proposal: Pubkey,
    pub amount: u64,
    pub choices: Vec<u16>,
    pub num_active_votes: u64,
    pub bump_seed: u8,
}

impl ReceiptV0 {
    pub fn space() -> usize {
        8 + 32 + 32 + 32 + 8 + 8 + 1
    }
}
