use crate::error::ErrorCode;
use crate::initialize_proposal_base_v0::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount as SPLTokenAccount};
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::TokenAccount as Token2022Account;

#[derive(Accounts)]
pub struct InitializeProposalByTokenV0<'info> {
    pub initialize_proposal_base: InitializeProposalBaseV0<'info>,

    pub proposer: Signer<'info>,

    /// CHECK: The token account must be owned by the Token program or the Token 2022 program.
    #[account(
        constraint = token_account.owner == &Token::id() || token_account.owner == &Token2022::id()
    )]
    pub token_account: AccountInfo<'info>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeProposalByTokenV0<'info>>,
    args: InitializeProposalArgsV0,
) -> Result<()> {
    let base = &ctx.accounts.initialize_proposal_base;
    let token_account = &ctx.accounts.token_account;

    if token_account.owner == &anchor_spl::token::ID {
        let token_account = SPLTokenAccount::try_deserialize(&mut &token_account.data.borrow()[..])?;
        assert_sufficient_weight(&base.guard.guard_type, &token_account)?;
    } else {
        let token_account = Token2022Account::try_deserialize(&mut &token_account.data.borrow()[..])?;
        assert_sufficient_weight_t22(&base.guard.guard_type, &token_account)?;
    }

    cpi_initialize_proposal(&base, args)
}

fn assert_sufficient_weight(guard_type: &GuardType, token: &SPLTokenAccount) -> Result<()> {
    let config = match guard_type {
        GuardType::MintList { guard_data } => guard_data
            .iter()
            .find(|config| config.address == token.mint)
            .ok_or(ErrorCode::MintNotValid)
            .cloned(),

        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if token.amount >= config.divisor {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}

fn assert_sufficient_weight_t22(guard_type: &GuardType, token: &Token2022Account) -> Result<()> {
    let config = match guard_type {
        GuardType::MintList { guard_data } => guard_data
            .iter()
            .find(|config| config.address == token.mint)
            .ok_or(ErrorCode::MintNotValid)
            .cloned(),

        _ => Err(ErrorCode::InstructionNotAllowed.into()),
    }?;

    if token.amount >= config.divisor {
        Ok(())
    } else {
        Err(ErrorCode::InsufficientWeight.into())
    }
}
