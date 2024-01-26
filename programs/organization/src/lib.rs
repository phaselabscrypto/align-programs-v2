use anchor_lang::prelude::*;

declare_id!("GaZVotekguK2dubFsnqHs8LFmKGDfRHBQXrwfVEXPa96");
pub mod state;

#[program]
pub mod organization {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
