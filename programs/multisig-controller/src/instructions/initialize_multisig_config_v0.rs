use crate::state::MultisigConfigV0;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeMultisigArgsV0 {
    pub name: String,
    // We are removing this and making it immutable to stop any chance of exploit
    // pub authority: Pubkey,
    pub use_reputation: bool,
    pub members: Vec<Pubkey>,
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
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeMultisigConfigV0>,
    args: InitializeMultisigArgsV0,
) -> Result<()> {
    ctx.accounts.multisig_config.set_inner(MultisigConfigV0 {
        name: args.name,
        members: args.members,
        bump: ctx.bumps["multisig_config"],
        use_reputation: args.use_reputation,
    });

    Ok(())
}
