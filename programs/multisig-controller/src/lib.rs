/**
 * 
 * Multi-sig vote controller. Handle voting based on a selection of keys, can use 
 * reputation as a add on in later implementations.
 * 
 */

use std::mem;
use anchor_lang::prelude::*;
use proposal::{ProposalConfigV0, ProposalV0};

declare_id!("F6FgmMhLmtCM8836YHnBKtTLhRMcCa3AcZgcM5wXkTJJ");
pub mod error;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeMultisigArgsV0 {
    pub name: String,
    pub authority: Pubkey,
    pub use_reputation: bool,
    pub members: Vec<Pubkey>,
}



#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct VoteV0Args {
    pub choice: u16
}

#[program]
pub mod multisig_controller {
    use super::*;

    pub fn initialize_multisig_config_v0(ctx: Context<InitializeMultisigConfigV0>, args: InitializeMultisigArgsV0) -> Result<()> {
        
        ctx.accounts.multisig_config.set_inner(MultisigConfigV0 {
            authority: args.authority,
            name: args.name,
            members: args.members,
            bump: ctx.bumps["multisig_config"],
            use_reputation: args.use_reputation
        });
        
        Ok(())
    }

    pub fn vote_v0(ctx: Context<VoteV0>, args: VoteV0Args) -> Result<()> {
        let voted_at = Clock::get().unwrap().unix_timestamp;

        // If vote account does not exists create it with no vote
        if ctx.accounts.vote_record.to_account_info().data_is_empty() {
            ctx.accounts.vote_record.set_inner(VoteRecordV0 {
                voter: ctx.accounts.voter.key(),
                proposal: ctx.accounts.proposal.key(),
                choice: None,
                bump: ctx.bumps["vote_record"],
                voted_at: 0
            })
        }
        
        require!(ctx.accounts.vote_record.choice.is_none(), error::ErrorCode::AlreadyVoted);

        ctx.accounts.vote_record.choice = Some(args.choice);
        ctx.accounts.vote_record.voted_at = voted_at;

        if ctx.accounts.multisig_config.use_reputation {
            // Not implemented yet
            panic!()
        } 
        else {
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
                    // Choice should we allow multiple for multisig. prob
                    choice: args.choice,
                    weight: 1,
                },
            )?;
        }

        Ok(())
    }

    pub fn relinguish_vote_v0(ctx: Context<VoteV0>) -> Result<()> {
        
        require!(ctx.accounts.vote_record.choice.is_some(), error::ErrorCode::NoVoteForThisChoice);

        ctx.accounts.vote_record.choice = None;
        ctx.accounts.vote_record.voted_at = 0i64;
        
        if ctx.accounts.multisig_config.use_reputation {
            // Not implemented yet
            panic!()
        } 
        else {
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
                    choice: ctx.accounts.vote_record.choice.unwrap(),
                    weight: 1,
                },
            )?;
        }

        Ok(())
    }
    
}

#[derive(Accounts)]
#[instruction(args: InitializeMultisigArgsV0)]
pub struct InitializeMultisigConfigV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = MultisigConfigV0::space(&args.name, &args.members),
        seeds = [b"multisig_config", args.name.as_bytes()],
        bump
    )]
    pub multisig_config: Account<'info, MultisigConfigV0>,
    pub system_program: Program<'info, System>

}

#[derive(Accounts)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = multisig_config.members.iter().any(|member| voter.key() == *member)
    )]
    pub voter: Signer<'info>,
    pub vote_controller: Signer<'info>,

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
    pub system_program: Program<'info, System>

}

#[derive(Accounts)]
pub struct RelinguishVoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = vote_record.voter == voter.key(),
    )]
    pub voter: Signer<'info>,
    pub vote_controller: Signer<'info>,

    #[account(
        mut,
        constraint = vote_record.proposal == proposal.key(),
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
    pub system_program: Program<'info, System>

}


#[account]
pub struct MultisigConfigV0 {
    pub authority: Pubkey,
    pub name: String,
    pub use_reputation: bool,
    pub bump: u8,
    pub members : Vec<Pubkey>
}

impl MultisigConfigV0 {
    pub fn space(name : &str, members : &Vec<Pubkey>) -> usize {
        8 + 4 + name.len() + 1 + 1 + 4 + (members.len() * 32)
    }
}


#[account]
pub struct VoteRecordV0 {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub choice: Option<u16>,
    pub voted_at : i64,
    pub bump : u8
    // Can vote on behalf of authority
    // pub delegate: Pubkey
}

impl VoteRecordV0 {
    pub fn space() -> usize {
        8 + 32 + 32 + mem::size_of::<u16>() + 1
    }
}

