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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum GuardType {
    CollectionMint { guard_data: Vec<MultiplierConfig> },
    FirstCreatorAddress { guard_data: Vec<MultiplierConfig> },
    MintList { guard_data: Vec<DivisorConfig> },
    WalletList { guard_data: Vec<MultiplierConfig> },
    Permissive,
}

impl GuardType {
    pub fn space(&self) -> usize {
        match self {
            GuardType::CollectionMint { guard_data }
            | GuardType::FirstCreatorAddress { guard_data }
            | GuardType::WalletList { guard_data } => {
                1 + 4 + guard_data.len() * MultiplierConfig::INIT_SPACE
            }
            GuardType::MintList { guard_data } => {
                1 + 4 + guard_data.len() * DivisorConfig::INIT_SPACE
            }
            GuardType::Permissive => 1,
        }
    }
}

#[account]
pub struct GuardV0 {
    pub name: String,
    pub guard_type: GuardType,
    pub bump: u8,
}

impl GuardV0 {
    pub fn space(name: &String, guard_type: &GuardType) -> usize {
        8 + name.len() + guard_type.space() + 1
    }
}
