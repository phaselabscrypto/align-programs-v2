use anchor_lang::prelude::*;
use std::mem;

#[account]
pub struct MultisigConfigV0 {
    // We are removing this and making it immutable to stop any chance of exploit
    // pub authority: Pubkey,
    pub name: String,
    pub use_reputation: bool,
    pub nonce: [u8; 32],
    pub bump: u8,
    pub members: Vec<Pubkey>,
}

impl MultisigConfigV0 {
    pub fn space(name: &str, members: &Vec<Pubkey>) -> usize {
        8 + 4 + name.len() + 1 + 1 + 32 + 4 + (members.len() * 32)
    }
}

#[macro_export]
macro_rules! multisig_config_seeds {
    ( $multisig_config:expr ) => {
        &[
            b"multisig_config",
            $multisig_config.nonce.as_ref(),
            &[$multisig_config.bump],
        ]
    };
}

#[account]
pub struct VoteRecordV0 {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub choice: Option<u16>,
    pub voted_at: i64,
    pub bump: u8, // Can vote on behalf of authority
                  // pub delegate: Pubkey
}

impl VoteRecordV0 {
    pub fn space() -> usize {
        8 + 32 + 32 + mem::size_of::<Option<u16>>() + mem::size_of::<i64>() + 1
    }
}
