use anchor_lang::prelude::*;

declare_id!("E6qW37nUQgCcqWxwjSkpeAfJeW17YzFbdrEtVrGPMExM");

#[program]
pub mod reputation {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
