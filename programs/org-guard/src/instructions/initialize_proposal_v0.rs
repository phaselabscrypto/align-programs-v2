use crate::metaplex::MetadataAccount;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use organization::state::OrganizationV0;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ChoiceArg {
    #[max_len(200)]
    pub name: String,
    /// Any other data that you may want to put in here
    #[max_len(200)]
    pub uri: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeProposalArgsV0 {
    pub name: String,
    pub uri: String,
    pub max_choices_per_voter: u16,
    pub choices: Vec<ChoiceArg>,
    // Tags which can be used to filter proposals
    pub tags: Vec<String>,
}

#[derive(Accounts)]
#[instruction(args: InitializeProposalArgsV0)]
pub struct InitializeProposalV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub proposer: Signer<'info>,
    pub guard: Account<'info, GuardV0>,
    /// CHECK: Setting this account, does not need a check. Putting here instead of args to save tx space
    pub owner: UncheckedAccount<'info>,
    #[account(
      mut,
      seeds = [
        b"proposal",
        organization.key().as_ref(),
        &organization.num_proposals.to_le_bytes()[..]
      ],
      seeds::program = organization.proposal_program,
      bump,
    )]
    /// CHECK: Checked via cpi
    pub proposal: AccountInfo<'info>,
    /// CHECK: Checked via cpi
    pub proposal_config: AccountInfo<'info>,
    #[account(
      mut,
      has_one = proposal_program,
      has_one = guard
    )]
    pub organization: Box<Account<'info, OrganizationV0>>,
    /// CHECK: Checked in the program
    pub mint: AccountInfo<'info>,
    #[account(
        seeds = ["metadata".as_bytes(), MetadataAccount::owner().as_ref(), mint.key().as_ref()],
        seeds::program = MetadataAccount::owner(),
        bump
    )]
    pub metadata: Account<'info, MetadataAccount>,
    #[account(
        associated_token::authority = proposer,
        associated_token::mint = mint,
  )]
    pub token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: Checked via address constraint
    #[account(
    address = organization.proposal_program
  )]
    pub proposal_program: UncheckedAccount<'info>,
    /// CHECK:
    #[account(executable)]
    pub organization_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeProposalV0>, args: InitializeProposalArgsV0) -> Result<()> {
    let metadata = ctx.accounts.metadata.clone();
    let bump = ctx.accounts.guard.bump;
    let choices: Vec<organization::instructions::ChoiceArg> = args
        .choices
        .into_iter()
        .map(|choice| organization::instructions::ChoiceArg {
            name: choice.name,
            uri: choice.uri,
        })
        .collect();

    ctx.accounts.guard.assert_is_valid_weight(
        &metadata,
        &ctx.accounts.mint,
        &ctx.accounts.token_account,
        &ctx.accounts.proposer,
    )?;

    organization::cpi::initialize_proposal_v0(
        CpiContext::new_with_signer(
            ctx.accounts.organization_program.to_account_info(),
            organization::cpi::accounts::InitializeProposalV0 {
                payer: ctx.accounts.payer.to_account_info(),
                guard: ctx.accounts.guard.to_account_info(),
                owner: ctx.accounts.owner.to_account_info(),
                proposal: ctx.accounts.proposal.to_account_info(),
                proposal_config: ctx.accounts.proposal_config.to_account_info(),
                organization: ctx.accounts.organization.to_account_info(),
                proposal_program: ctx.accounts.proposal_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            &[&[b"guard", ctx.accounts.guard.name.as_bytes(), &[bump]]],
        ),
        organization::instructions::InitializeProposalArgsV0 {
            name: args.name,
            uri: args.uri,
            max_choices_per_voter: args.max_choices_per_voter,
            choices,
            tags: args.tags,
        },
    )?;
    Ok(())
}