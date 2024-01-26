use anchor_lang::prelude::*;

/*
 * Ranking default config
 * voting default config
 */

#[account]
#[derive(Default, InitSpace)]
pub struct OrganizationV0 {
    pub num_proposals: u32,
    /// Authority to create proposals under this organization
    pub authority: Pubkey,
    pub default_proposal_config: Pubkey,
    pub proposal_program: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(200)]
    pub uri: String,
    pub bump_seed: u8,
}
