use std::collections::HashSet;

use anchor_lang::prelude::*;
use proposal::{ProposalState as CpiProposalState, ProposalV0};

pub const PERCENTAGE_DIVISOR: u32 = 1000000000;
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, PartialEq)]
pub enum StratProposalState {
  // Allow drafting proposal, in this state can add instructions and such to it
  #[default]
  Draft,
  Cancelled,
  /// Timestamp of when the voting started
  Voting {
    start_ts: i64,
  },
  /// The proposal is resolved and the choice specified choice indices won
  Resolved {
    choices: Vec<u16>,
    end_ts: i64,
  },
  /// Allow voting controller to set to a custom state,
  /// this allows for the implementation of more complex
  /// states like Vetoed, drafts, signing off, etc.
  /// This could have been an int, but then UIs would need to understand
  /// the calling contract to grab an enum from it. Rather just have something clean
  /// even though it takes a bit more space.
  Custom {
    name: String,
    // Allow storing arbitrary data in here
    bin: Vec<u8>,
  },
}

impl From<StratProposalState> for CpiProposalState {
    fn from(value: StratProposalState) -> Self {
      match value {
        StratProposalState::Draft => CpiProposalState::Draft,
        StratProposalState::Cancelled => CpiProposalState::Cancelled,
        StratProposalState::Voting{..} => CpiProposalState::Voting {
          start_ts: Clock::get().unwrap().unix_timestamp,
        },
        StratProposalState::Custom { name, bin } => CpiProposalState::Custom { name, bin },
        StratProposalState::Resolved { choices, end_ts } => CpiProposalState::Resolved { choices, end_ts },
      }
    }
  }
/**
 * Change resolutionsettings to be able to be dependent on the state of the proposals
 * ie: Ranking -> Resolutionsettings would be nft based up & down vote - variable time limit (where do we hold this info fuck)
 *      Voting -> Resolutionsettings would be  
 */

/// Allow building complex operations to decide resolution.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ResolutionNode {
    // Already resolved vote to a specifc choice
    Resolved {
        choices: Vec<u16>,
    },
    /// Simple: At the specified end timestamp, the proposal is resolved with the choice
    /// that has the most vote weight
    EndTimestamp {
        end_ts: i64,
    },
    /// At the specified offset  from start ts, the proposal is resolved with the choice
    OffsetFromStartTs {
        offset: i64,
    },
    /// The choice crosses this vote weight
    ChoiceVoteWeight {
        weight_threshold: u128,
    },
    /// The choice has this percentage (i32 / PERCENTAGE_DIVISOR)
    ChoicePercentage {
        percentage: i32,
    },
    /// Top n choices are resolved
    Top {
        n: u16,
    },
    /// Requires that a number of choices are resolved by other resolvers
    /// before returning non None
    NumResolved {
        n: u16,
    },
    And,
    Or,
}

impl Default for ResolutionNode {
    fn default() -> Self {
        ResolutionNode::Top { n: 1 }
    }
}

impl ResolutionNode {
    pub fn size(&self) -> usize {
        match self {
            ResolutionNode::Resolved { choices } => 4 + choices.len() * 2,
            ResolutionNode::EndTimestamp { .. } => 8,
            ResolutionNode::OffsetFromStartTs { .. } => 8,
            ResolutionNode::ChoiceVoteWeight { .. } => 16,
            ResolutionNode::ChoicePercentage { .. } => 4,
            ResolutionNode::Top { .. } => 4,
            ResolutionNode::And => 0,
            ResolutionNode::Or => 0,
            ResolutionNode::NumResolved { .. } => 4,
        }
    }
}

/// Reverse polish notation calculator
/// https://en.wikipedia.org/wiki/Reverse_Polish_notation
/// Do this to have a flat structure since rust doesn't like unbounded nesting of types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ResolutionStrategy {
    // Match state for different resolving strategies
    pub state: StratProposalState,
    pub nodes: Vec<ResolutionNode>,
}

pub fn intersect<T: std::cmp::Eq + std::hash::Hash + Clone>(a: Vec<T>, b: Vec<T>) -> Vec<T> {
    let unique_a: HashSet<_> = a.iter().collect();
    let unique_b: HashSet<_> = b.iter().collect();

    unique_a
        .intersection(&unique_b)
        .map(|&x| x.clone())
        .collect()
}

pub fn union<T: std::cmp::Eq + std::hash::Hash + Clone>(a: Vec<T>, b: Vec<T>) -> Vec<T> {
    let unique_a: HashSet<_> = a.iter().collect();
    let unique_b: HashSet<_> = b.iter().collect();

    unique_a.union(&unique_b).map(|&x| x.clone()).collect()
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ResolutionResult {
    pub choices: Vec<u16>,
    pub next_state: StratProposalState
}

impl Default for ResolutionResult{
    
    fn default() -> Self {
        Self { choices: vec![], next_state: StratProposalState::Resolved { choices: vec![], end_ts: 0 } }
    } 

}


impl ResolutionResult{

    fn new(choices: &Vec<u16>, next_state: StratProposalState) -> ResolutionResult {
        ResolutionResult{
            choices: choices.to_vec(),
            next_state
        }
    }
}



impl ResolutionStrategy {
    pub fn resolution(&self, proposal: &ProposalV0) -> Option<ResolutionResult> {
        let mut stack: Vec<Option<ResolutionResult>> = vec![];
        for input in &self.nodes {
            match input {
                ResolutionNode::Resolved { choices } => {
                    stack.push(Some(ResolutionResult::new(choices,StratProposalState::Resolved { choices: vec![], end_ts: 0 } )));
                }
                ResolutionNode::EndTimestamp { end_ts } => {
                    if Clock::get().unwrap().unix_timestamp > *end_ts {
                        let choices: Vec<u16> = proposal
                        .choices
                        .iter()
                        .enumerate()
                        .map(|i| i.0 as u16)
                        .collect();
                    
                        stack.push(Some(
                            ResolutionResult::new(&choices, StratProposalState::Resolved { choices: vec![], end_ts: 0 })
                            
                        ));
                    } else {
                        stack.push(None);
                    }
                }
                ResolutionNode::OffsetFromStartTs { offset } => match &proposal.state {
                    CpiProposalState::Voting { start_ts } => {
                        if Clock::get().unwrap().unix_timestamp > start_ts + offset {
                            let choices: Vec<u16> =  proposal
                            .choices
                            .iter()
                            .enumerate()
                            .map(|i| i.0 as u16)
                            .collect();

                            stack.push(Some(
                                ResolutionResult::new(&choices, StratProposalState::Resolved { choices: vec![], end_ts: 0 })
                            ));

                        } else {
                            stack.push(None);
                        }
                    }
                    CpiProposalState::Custom { name, bin } => {
                        if name == "Ranking" {
                            let start_ts = i64::from_le_bytes(bin[0..8].try_into().unwrap());
                            if Clock::get().unwrap().unix_timestamp > start_ts + offset {
                                let choices: Vec<u16> =  proposal
                                .choices
                                .iter()
                                .enumerate()
                                .map(|i| i.0 as u16)
                                .collect();

                            stack.push(Some(
                                ResolutionResult::new(&choices, StratProposalState::Voting { start_ts: 0 })
                            ));

                            } else {
                                stack.push(None);
                            }
                        } else {
                            stack.push(None);
                        }
                    }
                    _ => stack.push(None),
                },
                ResolutionNode::ChoiceVoteWeight { weight_threshold } => {
                    let choices: Vec<u16> = proposal
                    .choices
                    .iter()
                    .enumerate()
                    .flat_map(|(index, choice)| {
                        if choice.weight >= *weight_threshold {
                            Some(index as u16)
                        } else {
                            None
                        }
                    })
                    .collect();
            
                    stack.push(Some(
                        ResolutionResult::new(&choices, StratProposalState::Resolved { choices: vec![], end_ts: 0 })
                    )
                    
                )},
                ResolutionNode::ChoicePercentage { percentage } => {
                    let total_weight = proposal
                        .choices
                        .iter()
                        .map(|choice| choice.weight)
                        .sum::<u128>();
                    let threshold = total_weight
                        .checked_mul(*percentage as u128)
                        .unwrap()
                        .checked_div(PERCENTAGE_DIVISOR as u128)
                        .map(|result| {
                            let remainder = total_weight
                                .checked_mul(*percentage as u128)
                                .unwrap()
                                .checked_rem(PERCENTAGE_DIVISOR as u128)
                                .unwrap();
                            result
                                .checked_add(if remainder > 0 { 1 } else { 0 })
                                .unwrap()
                        })
                        .unwrap();
                    let choices: Vec<u16> = proposal
                    .choices
                    .iter()
                    .enumerate()
                    .flat_map(|(index, choice)| {
                        if threshold == 0 {
                            return None;
                        } else if choice.weight >= threshold {
                            Some(index as u16)
                        } else {
                            None
                        }
                    })
                    .collect();

                    let ret = Some(
                        ResolutionResult::new(&choices, StratProposalState::Resolved { choices: vec![], end_ts: 0 })
                    );
                    stack.push(ret)
                }
                ResolutionNode::Top { n } => {
                    let mut vec = proposal.choices.iter().enumerate().collect::<Vec<_>>();

                    vec.sort_by(|(_, a), (_, b)| b.weight.cmp(&a.weight));
                    let choices : Vec<u16> =  vec.iter()
                    .map(|(index, _)| *index as u16)
                    .take(*n as usize)
                    .collect();

                    stack.push(Some(
                        ResolutionResult::new(&choices, StratProposalState::Resolved { choices: vec![], end_ts: 0 })
                    ))
                }
                ResolutionNode::And => {
                    let left = stack.pop().unwrap();
                    let right = stack.pop().unwrap();

                    let ret = match (left, right) {
                        (Some(left), Some(right)) => {
                           let res = intersect(left.choices, right.choices);
                           Some(ResolutionResult::new(&res, StratProposalState::Resolved { choices: vec![], end_ts: 0 }))
                        },
                        _ => None,
                    };

                    stack.push(ret)
                }
                ResolutionNode::Or => {
                    let left = stack.pop().unwrap();
                    let right = stack.pop().unwrap();

                    let ret = match (left, right) {
                        (Some(left), Some(right)) =>{ 
                            
                            let res= union(left.choices, right.choices);
                            Some(ResolutionResult::new(&res, StratProposalState::Resolved { choices: vec![], end_ts: 0 }))
                        },
                        (Some(left), None) => Some(ResolutionResult::new(&left.choices, left.next_state)),
                        (None, Some(right)) => Some(ResolutionResult::new(&right.choices, right.next_state)),
                        _ => None,
                    };

                    stack.push(ret)
                }
                ResolutionNode::NumResolved { n } => {
                    let curr = stack.get(0).unwrap();
                    match curr {
                        Some(vec) if vec.choices.len() >= *n as usize => stack.push(Some(vec.clone())),
                        _ => stack.push(None),
                    }
                }
            }
        }

        stack.pop().unwrap()
    }
}

#[account]
pub struct ResolutionSettingsV0 {
    pub name: String,
    pub bump_seed: u8,
    pub settings: Vec<ResolutionStrategy>,

}

#[macro_export]
macro_rules! resolution_setting_seeds {
    ( $settings:expr ) => {
        &[
            b"resolution_settings",
            $settings.name.as_bytes(),
            &[$settings.bump_seed],
        ]
    };
}
