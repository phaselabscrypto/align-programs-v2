use anchor_lang::prelude::*;

declare_id!("HEMPVSuZruC176FM63mCk8M86Hgxtims5VNGh1d6M8HX");

pub mod error;
pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;
/*
 * State controller should be able to customize state ordering
 * the option to have ranking come before voting, voting (signoff) -> Ranking -> Voting
 *
 * IDEA:
 *     voting controller has to aggregate two different methods of voting based on state.
 *      this should be setup via project and be extendable
 *      Pretty much a proxy for states goin to other state controlletrs
 *
 */
#[program]
pub mod state_controller {

    use super::*;

    pub fn on_vote_v0(ctx: Context<OnVoteV0>, args: VoteArgsV0) -> Result<Option<ResolutionResult>> {
        on_vote_v0::handler(ctx, args)
      }
    
      pub fn initialize_resolution_settings_v0(
        ctx: Context<InitializeResolutionSettingsV0>,
        args: InitializeResolutionSettingsArgsV0,
      ) -> Result<()> {
        initialize_resolution_settings_v0::handler(ctx, args)
      }
    
      pub fn update_state_v0(ctx: Context<UpdateStateV0>, args: UpdateStateArgsV0) -> Result<()> {
        update_state_v0::handler(ctx, args)
      }
    
      pub fn resolve_v0(ctx: Context<ResolveV0>) -> Result<()> {
        resolve_v0::handler(ctx)
      }
}
