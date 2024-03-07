use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct OrganizationV0 {
    pub num_proposals: u32,
    /// Authority to to change settings (should be self goverend through an org wallet)
    pub authority: Pubkey,
    /// Guard signer to restrict who can create proposals
    pub guard: Pubkey,
    // Is this a subdao pubkey::default() if not
    pub parent: Pubkey,
    pub default_proposal_config: Pubkey,
    pub proposal_program: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(200)]
    pub uri: String,
    pub bump_seed: u8,
}

#[macro_export]
macro_rules! organization_seeds {
    ( $organization:expr ) => {
        &[
            b"organization",
            $organization.name.as_bytes(),
            &[$organization.bump_seed],
        ]
    };
}
