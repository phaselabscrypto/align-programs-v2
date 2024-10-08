export type Proposal = {
  "version": "0.1.0",
  "name": "proposal",
  "instructions": [
    {
      "name": "initializeProposalV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Every proposal must have a namespace to prevent seed collision"
          ]
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalConfig",
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
            "defined": "InitializeProposalArgsV0"
          }
        }
      ]
    },
    {
      "name": "initializeProposalConfigV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Every proposal config must have an owner to prevent seed collision"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "proposal_config"
              },
              {
                "kind": "arg",
                "type": {
                  "defined": "InitializeProposalConfigArgsV0"
                },
                "path": "args.name"
              }
            ]
          }
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
            "defined": "InitializeProposalConfigArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV0",
      "accounts": [
        {
          "name": "voteController",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller",
            "vote_controller"
          ]
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
          "name": "onVoteHook",
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
      "name": "updateStateV0",
      "accounts": [
        {
          "name": "stateController",
          "isMut": false,
          "isSigner": true
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
            "state_controller"
          ]
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateStateArgsV0"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "proposalConfigV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteController",
            "docs": [
              "Signer that controls voting and vote weights"
            ],
            "type": "publicKey"
          },
          {
            "name": "stateController",
            "docs": [
              "Signer that controls the transitions of `ProposalState`",
              "You can either use the default `state-controller` smart contract",
              "Or you can implement a program that calls the `resolve_v0` method.",
              "The vote can only be resolved when this `resolution_settings` PDA signs `resolve_v0`. This allows",
              "you to trigger resolution on either (a) a vote, (b) a timestamp, or (c) some custom trigger with clockwork"
            ],
            "type": "publicKey"
          },
          {
            "name": "onVoteHook",
            "docs": [
              "Optional program that will be called with `on_vote_v0` after every vote. This allows you to resolve",
              "the vote eagerly. For most use cases, this should just be the owner of the state controller.",
              "WARNING: This program has full authority to set the outcome of votes, make sure you trust it"
            ],
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
      "name": "proposalV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "state",
            "type": {
              "defined": "ProposalState"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "proposalConfig",
            "type": "publicKey"
          },
          {
            "name": "maxChoicesPerVoter",
            "docs": [
              "Allows for multiple selection votes"
            ],
            "type": "u16"
          },
          {
            "name": "seed",
            "type": "bytes"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "URI to json containing name, description, etc"
            ],
            "type": "string"
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "Choice"
              }
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
      "name": "InitializeProposalConfigArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "voteController",
            "docs": [
              "Signer that controls voting and vote weights"
            ],
            "type": "publicKey"
          },
          {
            "name": "stateController",
            "docs": [
              "Signer that controls the transitions of `ProposalState`",
              "You can either use the default `state-controller` smart contract",
              "Or you can implement a program that calls the `resolve_v0` method.",
              "The vote can only be resolved when this `resolution_settings` PDA signs `resolve_v0`. This allows",
              "you to trigger resolution on either (a) a vote, (b) a timestamp, or (c) some custom trigger with clockwork"
            ],
            "type": "publicKey"
          },
          {
            "name": "onVoteHook",
            "docs": [
              "Optional program that will be called with `on_vote_v0` after every vote",
              "Defaults to the owner of `resolution_settings`, which allows it to reactively call resolve_v0"
            ],
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ChoiceArg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Any other data that you may want to put in here"
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "InitializeProposalArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "Allow a custom seed for indexing"
            ],
            "type": "bytes"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "maxChoicesPerVoter",
            "docs": [
              "Allows for multiple selection votes"
            ],
            "type": "u16"
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "ChoiceArg"
              }
            }
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateStateArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newState",
            "type": {
              "defined": "ProposalState"
            }
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
          },
          {
            "name": "weight",
            "type": "u128"
          },
          {
            "name": "removeVote",
            "docs": [
              "This is a remove operation"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Choice",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "weight",
            "docs": [
              "Total vote weight behind this choice. u128 to support u64 tokens multiplied by a large multiplier (as in helium)"
            ],
            "type": "u128"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Any other data that you may want to put in here"
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ProposalState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Draft"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Voting",
            "fields": [
              {
                "name": "start_ts",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Resolved",
            "fields": [
              {
                "name": "choices",
                "type": {
                  "vec": "u16"
                }
              },
              {
                "name": "end_ts",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Custom",
            "fields": [
              {
                "name": "name",
                "type": "string"
              },
              {
                "name": "bin",
                "type": "bytes"
              }
            ]
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ArithmeticError",
      "msg": "Error in arithmetic"
    }
  ]
};

export const IDL: Proposal = {
  "version": "0.1.0",
  "name": "proposal",
  "instructions": [
    {
      "name": "initializeProposalV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "namespace",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Every proposal must have a namespace to prevent seed collision"
          ]
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "proposalConfig",
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
            "defined": "InitializeProposalArgsV0"
          }
        }
      ]
    },
    {
      "name": "initializeProposalConfigV0",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "Every proposal config must have an owner to prevent seed collision"
          ]
        },
        {
          "name": "proposalConfig",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "proposal_config"
              },
              {
                "kind": "arg",
                "type": {
                  "defined": "InitializeProposalConfigArgsV0"
                },
                "path": "args.name"
              }
            ]
          }
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
            "defined": "InitializeProposalConfigArgsV0"
          }
        }
      ]
    },
    {
      "name": "voteV0",
      "accounts": [
        {
          "name": "voteController",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "voter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "stateController",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposalConfig",
          "isMut": false,
          "isSigner": false,
          "relations": [
            "on_vote_hook",
            "state_controller",
            "vote_controller"
          ]
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
          "name": "onVoteHook",
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
      "name": "updateStateV0",
      "accounts": [
        {
          "name": "stateController",
          "isMut": false,
          "isSigner": true
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
            "state_controller"
          ]
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": "UpdateStateArgsV0"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "proposalConfigV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voteController",
            "docs": [
              "Signer that controls voting and vote weights"
            ],
            "type": "publicKey"
          },
          {
            "name": "stateController",
            "docs": [
              "Signer that controls the transitions of `ProposalState`",
              "You can either use the default `state-controller` smart contract",
              "Or you can implement a program that calls the `resolve_v0` method.",
              "The vote can only be resolved when this `resolution_settings` PDA signs `resolve_v0`. This allows",
              "you to trigger resolution on either (a) a vote, (b) a timestamp, or (c) some custom trigger with clockwork"
            ],
            "type": "publicKey"
          },
          {
            "name": "onVoteHook",
            "docs": [
              "Optional program that will be called with `on_vote_v0` after every vote. This allows you to resolve",
              "the vote eagerly. For most use cases, this should just be the owner of the state controller.",
              "WARNING: This program has full authority to set the outcome of votes, make sure you trust it"
            ],
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
      "name": "proposalV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "namespace",
            "type": "publicKey"
          },
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "state",
            "type": {
              "defined": "ProposalState"
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "proposalConfig",
            "type": "publicKey"
          },
          {
            "name": "maxChoicesPerVoter",
            "docs": [
              "Allows for multiple selection votes"
            ],
            "type": "u16"
          },
          {
            "name": "seed",
            "type": "bytes"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "URI to json containing name, description, etc"
            ],
            "type": "string"
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "Choice"
              }
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
      "name": "InitializeProposalConfigArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "voteController",
            "docs": [
              "Signer that controls voting and vote weights"
            ],
            "type": "publicKey"
          },
          {
            "name": "stateController",
            "docs": [
              "Signer that controls the transitions of `ProposalState`",
              "You can either use the default `state-controller` smart contract",
              "Or you can implement a program that calls the `resolve_v0` method.",
              "The vote can only be resolved when this `resolution_settings` PDA signs `resolve_v0`. This allows",
              "you to trigger resolution on either (a) a vote, (b) a timestamp, or (c) some custom trigger with clockwork"
            ],
            "type": "publicKey"
          },
          {
            "name": "onVoteHook",
            "docs": [
              "Optional program that will be called with `on_vote_v0` after every vote",
              "Defaults to the owner of `resolution_settings`, which allows it to reactively call resolve_v0"
            ],
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "ChoiceArg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Any other data that you may want to put in here"
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "InitializeProposalArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "Allow a custom seed for indexing"
            ],
            "type": "bytes"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "maxChoicesPerVoter",
            "docs": [
              "Allows for multiple selection votes"
            ],
            "type": "u16"
          },
          {
            "name": "choices",
            "type": {
              "vec": {
                "defined": "ChoiceArg"
              }
            }
          },
          {
            "name": "tags",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "UpdateStateArgsV0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newState",
            "type": {
              "defined": "ProposalState"
            }
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
          },
          {
            "name": "weight",
            "type": "u128"
          },
          {
            "name": "removeVote",
            "docs": [
              "This is a remove operation"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "Choice",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "weight",
            "docs": [
              "Total vote weight behind this choice. u128 to support u64 tokens multiplied by a large multiplier (as in helium)"
            ],
            "type": "u128"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "uri",
            "docs": [
              "Any other data that you may want to put in here"
            ],
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "ProposalState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Draft"
          },
          {
            "name": "Cancelled"
          },
          {
            "name": "Voting",
            "fields": [
              {
                "name": "start_ts",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Resolved",
            "fields": [
              {
                "name": "choices",
                "type": {
                  "vec": "u16"
                }
              },
              {
                "name": "end_ts",
                "type": "i64"
              }
            ]
          },
          {
            "name": "Custom",
            "fields": [
              {
                "name": "name",
                "type": "string"
              },
              {
                "name": "bin",
                "type": "bytes"
              }
            ]
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ArithmeticError",
      "msg": "Error in arithmetic"
    }
  ]
};
