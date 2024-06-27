use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TokenConfig {
    pub address: Pubkey,
    pub weight_reciprocal: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct NftConfig {
    pub address: Pubkey,
    pub weight: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum GuardType {
    CollectionMint { nft_configs: [NftConfig; 6] },
    FirstCreatorAddress { nft_configs: [NftConfig; 6] },
    // This is not implemented yet
    MintList { token_configs: [TokenConfig; 6] },
    WalletList { token_configs: [TokenConfig; 6] },
    Permissive,
}

#[account]
#[derive(InitSpace)]
pub struct GuardV0 {
    #[max_len(32)]
    pub name: String,
    // We are removing this and making it immutable to stop any chance of exploit
    // pub authority: Pubkey,
    pub guard_type: GuardType,
    pub bump: u8,
}

/*
impl GuardV0 {
    pub fn find_token_config(
        &self,
        metadata: &MetadataAccount,
        mint: &AccountInfo,
        proposer: &AccountInfo,
    ) -> Result<TokenConfig> {
        match &self.guard_type {
            GuardType::CollectionMint { token_configs } => match metadata.collection.as_ref() {
                Some(col) if col.verified => token_configs
                    .iter()
                    .find(|config| config.address == col.key)
                    .ok_or(ErrorCode::CollectionVerificationFailed.into())
                    .cloned(),
                _ => Err(ErrorCode::CollectionVerificationFailed.into()),
            },
            GuardType::FirstCreatorAddress { token_configs } => {
                if let Some(creators) = metadata.data.creators.as_ref() {
                    if let Some(first_creator) = creators.iter().find(|creator| creator.verified) {
                        token_configs
                            .iter()
                            .find(|config| config.address == first_creator.address)
                            .ok_or(ErrorCode::FirstCreatorAddressVerificationFailed.into())
                            .cloned()
                    } else {
                        Err(ErrorCode::FirstCreatorAddressVerificationFailed.into())
                    }
                } else {
                    Err(ErrorCode::FirstCreatorAddressVerificationFailed.into())
                }
            }
            GuardType::MintList { token_configs } => token_configs
                .iter()
                .find(|config| config.address == mint.key())
                .ok_or(ErrorCode::MintNotValid.into())
                .cloned(),
            GuardType::WalletList { token_configs } => token_configs
                .iter()
                .find(|config| config.address == proposer.key())
                .ok_or(ErrorCode::ProposerNotValid.into())
                .cloned(),
            GuardType::Permissive => Ok(TokenConfig {
                address: Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap(),
                weight_reciprocal: 0,
            }),
        }
    }
    pub fn assert_is_valid_weight(
        &self,
        metadata: &MetadataAccount,
        mint: &AccountInfo,
        token: &TokenAccount,
        proposer: &AccountInfo,
    ) -> Result<()> {
        let config = self.find_token_config(metadata, mint, proposer)?;

        if token.amount >= config.weight_reciprocal {
            Ok(())
        } else {
            Err(ErrorCode::InsufficientWeight.into())
        }
    }
}
*/
