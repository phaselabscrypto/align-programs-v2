use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct DivisorConfig {
    pub address: Pubkey,
    pub divisor: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct MultiplierConfig {
    pub address: Pubkey,
    pub multiplier: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum GuardType {
    CollectionMint { guard_data: [MultiplierConfig; 6] },
    FirstCreatorAddress { guard_data: [MultiplierConfig; 6] },
    MintList { guard_data: [DivisorConfig; 6] },
    WalletList { guard_data: [MultiplierConfig; 6] },
    Permissive,
}

#[account]
#[derive(InitSpace)]
pub struct GuardV0 {
    #[max_len(32)]
    pub name: String,
    pub guard_type: GuardType,
    pub bump: u8,
}
