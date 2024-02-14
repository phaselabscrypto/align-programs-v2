use std::mem;

use anchor_lang::prelude::*;
use error::ErrorCode;
use proposal::{ProposalConfigV0, ProposalState, ProposalV0};

declare_id!("4DXSkEgY4NTApL27cfX2tviysBKPrxWa4W3wAWTb4oGo");

pub mod error;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeProxyArgsV0 {
    pub name: String,
    pub authority: Pubkey,
    pub conditionals: Vec<ConditionalController>,
    pub fallback_contoller: Pubkey,
}

/**
 * This program has one account that acts as a votecontroller but can proxie
 * instruction calls based on some condition, such as proposal state or proposal value
 */
#[program]
pub mod vote_proxy {

    use super::*;

    pub fn initialize_proxy_v0(
        ctx: Context<Initialize>,
        args: InitializeProxyArgsV0,
    ) -> Result<()> {

        let conditionals = if args.conditionals.len() == 0  {
            let default_conditional = ConditionalController::default();
            let conditions = vec![default_conditional];
            conditions
        }
        else{
            args.conditionals
        };

        ctx.accounts.proxy.set_inner(ProxyV0 {
            authority: args.authority,
            fallback_contoller: args.fallback_contoller,
            name: args.name,
            bump: *ctx.bumps.get("proxy").unwrap(),
            conditionals,
        });

        Ok(())
    }

    pub fn vote_v0<'info>(ctx: Context<'_, '_, '_, 'info, VoteV0<'info>>, choice: u16) -> Result<()> {
        let proxy = &ctx.accounts.proxy;
        let proposal = &ctx.accounts.proposal;
        
        for conditional in &proxy.conditionals {
            if conditional.condition.evaluate(proposal)? {
                let controller_pubkey = conditional.controller_pubkey;
                let program_info = ctx.remaining_accounts.last().unwrap();
                match controller_pubkey {
                    pubkey if pubkey == nft_voter::id() => {
                        let name = ctx.accounts.proxy.name.as_bytes();
                        let bump = ctx.accounts.proxy.bump;
                        let seeds = [b"proxy", name, &[bump]];
                        let signers = vec![seeds.as_slice()];

                        nft_voter::cpi::vote_v1(CpiContext::new_with_signer(
                            program_info.to_owned(),
                            nft_voter::cpi::accounts::VoteV1{
                                payer: ctx.accounts.payer.to_account_info(),
                                marker: ctx.remaining_accounts[0].clone(),
                                nft_voter: ctx.remaining_accounts[1].clone(),
                                voter: ctx.accounts.voter.to_account_info(),
                                mint: ctx.remaining_accounts[2].clone(),
                                metadata: ctx.remaining_accounts[3].clone(),
                                token_account: ctx.remaining_accounts[4].clone(),
                                proposal: proposal.to_account_info(),
                                proposal_config: ctx.accounts.proposal_config.to_account_info(),
                                state_controller: ctx.accounts.state_controller.to_account_info(),
                                on_vote_hook: ctx.accounts.on_vote_hook.to_account_info(),
                                proposal_program: ctx.accounts.proposal_program.to_account_info(),
                                system_program: ctx.accounts.system_program.to_account_info(),
                                vote_controller: ctx.accounts.proxy.to_account_info()
                            },  &signers), nft_voter::VoteArgsV0 { choice })?;
                    }
                    _ => return Err(ErrorCode::InvalidController.into())
                }
                
            }
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(args: InitializeProxyArgsV0)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = ProxyV0::size(args.conditionals, &args.name),
        seeds = [b"proxy", args.name.as_bytes()],
        bump
      )]
    pub proxy: Account<'info, ProxyV0>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub voter: Signer<'info>,
    pub proxy: Account<'info, ProxyV0>,
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
    /// CHECK: Checked in cpi
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Condition {
    pub operator: ComparisonOperator,
    pub operand: Operand, // Only one operand is stored
}


impl Default for Condition {
    fn default() -> Self {
        return Self {
            operator: ComparisonOperator::Equals,
            operand: Operand::ProposalState(2),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConditionalController {
    pub condition: Condition,
    pub controller_pubkey: Pubkey,
}

impl Default for ConditionalController {
    fn default() -> Self {
        return Self {
            condition: Condition::default(),
            controller_pubkey: nft_voter::id(),
        }
    }
}

trait ProposalStateExt {
    fn to_numeric(&self) -> u8;
}

impl ProposalStateExt for ProposalState {
    fn to_numeric(&self) -> u8 {
        match self {
            ProposalState::Draft => 0,
            ProposalState::Cancelled => 1,
            ProposalState::Voting { .. } => 2,
            ProposalState::Resolved { .. } => 3,
            ProposalState::Custom { .. } => 4,
        }
    }
}

impl Condition {
    pub fn evaluate(&self, proposal: &ProposalV0) -> Result<bool> {
        let derived_value: u64 = match &self.operand {
            Operand::TransactionValue(val) => return Err(error!(ErrorCode::FeatureNotImplemented)),
            Operand::ProposalState(val) => *val as u64,
        };
        let state_u8: u8 = proposal.state.to_numeric();
        match self.operator {
            ComparisonOperator::Equals => Ok(derived_value == state_u8 as u64),
            ComparisonOperator::NotEquals => {
                Ok(derived_value !=  state_u8 as u64)
            }
            ComparisonOperator::GreaterThan => {
                Ok(derived_value >  state_u8 as u64)
            }
            ComparisonOperator::LessThan => Ok(derived_value <  state_u8 as u64),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ComparisonOperator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Operand {
    TransactionValue(u64),
    ProposalState(u8),
}

#[account]
pub struct ProxyV0 {
    pub authority: Pubkey,
    pub fallback_contoller: Pubkey,
    pub name: String,
    pub bump: u8,
    pub conditionals: Vec<ConditionalController>,
}

impl ProxyV0 {
    // THis is not working properly double check
    pub fn size(conditionals: Vec<ConditionalController>, name: &str) -> usize {
        8 +
        4 + (conditionals.len().max(1) * mem::size_of::<ConditionalController>())
            + 32
            + 32
            + 4
            + name.len()
            + 1
    }
}
