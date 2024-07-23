use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeGuardArgsV0 {
    pub name: String,
    pub guard_type: GuardType,
}

#[derive(Accounts)]
#[instruction(args: InitializeGuardArgsV0)]
pub struct InitializeGuardV0<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + GuardV0::space(&args.name, &args.guard_type),
        seeds = [b"guard", args.name.as_bytes()],
        bump
    )]
    pub nft_guard: Box<Account<'info, GuardV0>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeGuardV0>, args: InitializeGuardArgsV0) -> Result<()> {
    ctx.accounts.nft_guard.set_inner(GuardV0 {
        name: args.name,
        guard_type: args.guard_type,
        bump: ctx.bumps["nft_guard"],
    });

    Ok(())
}
