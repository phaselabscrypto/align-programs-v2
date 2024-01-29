export type NftVoter = {
  "version": "0.1.0",
  "name": "nft_voter",
  "instructions": [
    {
      "name": "initializeNftVoterV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftVoter",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "nft_voter"
              },
              {
                "kind": "arg",
                "type": {
                  "defined": "InitializeNftVoterArgsV0"
                },
                "path": "args.name"
              }
            ]
          }
        },
        {
          "name": "collection",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "InitializeNftVoterArgsV0"
          }
        }
      ]
    },
    {
      "name": "relinquishVoteV0",
      "accounts": [
        {
          "name": "refund",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Account to receive sol refund if marker is closed"
          ]
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          },
          "relations": [
            "nft_voter"
          ]
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RelinquishVoteArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VoteArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV1",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voteController",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VoteArgsV0"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "nftVoterV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "collection",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteMarkerV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "nftVoter",
            "type": "publicKey"
          },
          {
            "name": "proposal",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "choices",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeNftVoterArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "RelinquishVoteArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "choice",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "VoteArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "choice",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "Key",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Uninitialized"
          },
          {
            "name": "EditionV1"
          },
          {
            "name": "MasterEditionV1"
          },
          {
            "name": "ReservationListV1"
          },
          {
            "name": "MetadataV1"
          },
          {
            "name": "ReservationListV2"
          },
          {
            "name": "MasterEditionV2"
          },
          {
            "name": "EditionMarker"
          },
          {
            "name": "UseAuthorityRecord"
          },
          {
            "name": "CollectionAuthorityRecord"
          },
          {
            "name": "TokenOwnedEscrow"
          },
          {
            "name": "TokenRecord"
          },
          {
            "name": "MetadataDelegate"
          }
        ]
      }
    },
    {
      "name": "CollectionDetails",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "V1",
            "fields": [
              {
                "name": "size",
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ProgrammableConfig",
      "docs": [
        "Configuration for programmable assets."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "V1",
            "fields": [
              {
                "name": "rule_set",
                "docs": [
                  "Programmable authorization rules."
                ],
                "type": {
                  "option": "publicKey"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "UseMethod",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Burn"
          },
          {
            "name": "Multiple"
          },
          {
            "name": "Single"
          }
        ]
      }
    },
    {
      "name": "TokenStandard",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NonFungible"
          },
          {
            "name": "FungibleAsset"
          },
          {
            "name": "Fungible"
          },
          {
            "name": "NonFungibleEdition"
          },
          {
            "name": "ProgrammableNonFungible"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyVoted",
      "msg": "Already voted for this choice"
    },
    {
      "code": 6001,
      "name": "MaxChoicesExceeded",
      "msg": "Exceeded max choices"
    },
    {
      "code": 6002,
      "name": "NoVoteForThisChoice",
      "msg": "No vote to relinquish for this choice"
    }
  ]
};

export const IDL: NftVoter = {
  "version": "0.1.0",
  "name": "nft_voter",
  "instructions": [
    {
      "name": "initializeNftVoterV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "nftVoter",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "nft_voter"
              },
              {
                "kind": "arg",
                "type": {
                  "defined": "InitializeNftVoterArgsV0"
                },
                "path": "args.name"
              }
            ]
          }
        },
        {
          "name": "collection",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "InitializeNftVoterArgsV0"
          }
        }
      ]
    },
    {
      "name": "relinquishVoteV0",
      "accounts": [
        {
          "name": "refund",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Account to receive sol refund if marker is closed"
          ]
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          },
          "relations": [
            "nft_voter"
          ]
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "RelinquishVoteArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VoteArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV1",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "marker",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "marker"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "NftVoterV0",
                "path": "nft_voter"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "ProposalV0",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "nftVoter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voteController",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "metadata",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false,
          "relations": [
            "proposal_config"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller"
          ]
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "onVoteHook",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "VoteArgsV0"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "nftVoterV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "collection",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteMarkerV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "nftVoter",
            "type": "publicKey"
          },
          {
            "name": "proposal",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "choices",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "bumpSeed",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "InitializeNftVoterArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "RelinquishVoteArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "choice",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "VoteArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "choice",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "Key",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Uninitialized"
          },
          {
            "name": "EditionV1"
          },
          {
            "name": "MasterEditionV1"
          },
          {
            "name": "ReservationListV1"
          },
          {
            "name": "MetadataV1"
          },
          {
            "name": "ReservationListV2"
          },
          {
            "name": "MasterEditionV2"
          },
          {
            "name": "EditionMarker"
          },
          {
            "name": "UseAuthorityRecord"
          },
          {
            "name": "CollectionAuthorityRecord"
          },
          {
            "name": "TokenOwnedEscrow"
          },
          {
            "name": "TokenRecord"
          },
          {
            "name": "MetadataDelegate"
          }
        ]
      }
    },
    {
      "name": "CollectionDetails",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "V1",
            "fields": [
              {
                "name": "size",
                "type": "u64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "ProgrammableConfig",
      "docs": [
        "Configuration for programmable assets."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "V1",
            "fields": [
              {
                "name": "rule_set",
                "docs": [
                  "Programmable authorization rules."
                ],
                "type": {
                  "option": "publicKey"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "UseMethod",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Burn"
          },
          {
            "name": "Multiple"
          },
          {
            "name": "Single"
          }
        ]
      }
    },
    {
      "name": "TokenStandard",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "NonFungible"
          },
          {
            "name": "FungibleAsset"
          },
          {
            "name": "Fungible"
          },
          {
            "name": "NonFungibleEdition"
          },
          {
            "name": "ProgrammableNonFungible"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyVoted",
      "msg": "Already voted for this choice"
    },
    {
      "code": 6001,
      "name": "MaxChoicesExceeded",
      "msg": "Exceeded max choices"
    },
    {
      "code": 6002,
      "name": "NoVoteForThisChoice",
      "msg": "No vote to relinquish for this choice"
    }
  ]
};
