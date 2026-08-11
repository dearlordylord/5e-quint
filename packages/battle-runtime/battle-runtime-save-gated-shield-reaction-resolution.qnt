// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeSaveGatedShieldReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveGatedDamageResolution.* from "./battle-runtime-save-gated-damage-resolution"
  import battleRuntimeShieldReactionDecision.* from "./battle-runtime-shield-reaction-decision"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield
  type SaveGatedShieldReactionContinuation =
    | SaveGatedShieldIceKnife

  type SaveGatedShieldReactionFrame = {
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: SaveGatedShieldReactionContinuation,
  }

  type SaveGatedShieldReactionCandidate =
    | NoSaveGatedShieldReactionCandidate
    | HasSaveGatedShieldReactionCandidate(SaveGatedShieldReactionFrame)

  pure def saveGatedShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): SaveGatedShieldReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (shieldReactionFrameIsFreshGoblinTarget(frame) and
              frame.trigger == AttackHit and
              frame.continuation == ResumeIceKnife)
            HasSaveGatedShieldReactionCandidate({
              eligibleReactors: frame.eligibleReactors,
              offeredReactors: frame.offeredReactors,
              continuation: SaveGatedShieldIceKnife,
            })
          else
            NoSaveGatedShieldReactionCandidate
      | _ => NoSaveGatedShieldReactionCandidate
    }

  pure def resumeSaveGatedShieldReactionContinuation(
    state: BattleState,
    continuation: SaveGatedShieldReactionContinuation,
  ): BattleState =
    match continuation {
      | SaveGatedShieldIceKnife =>
          resolveIceKnife(state, 15, 10, 4, false, true, false, 6, true, true)
    }

  pure def resolveSaveGatedShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: SaveGatedShieldReactionFrame,
  ): BattleState =
    match takeShieldReactionDecision(
      state,
      reactor,
      frame.eligibleReactors,
      frame.offeredReactors,
    ) {
      | ShieldReactionDecisionTaken(data) =>
          if (data.frameClosed)
            resumeSaveGatedShieldReactionContinuation(data.state, frame.continuation)
          else
            data.state
      | _ => state
    }

  pure def declineSaveGatedShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: SaveGatedShieldReactionFrame,
  ): BattleState =
    match declineShieldReactionDecision(
      state,
      reactor,
    ) {
      | ShieldReactionDecisionDeclined(data) =>
          if (data.frameClosed)
            resumeShieldReactionAfterDecline(
              data.state,
              reactor,
              resumeState => resumeSaveGatedShieldReactionContinuation(
                resumeState,
                frame.continuation,
              ),
            )
          else
            data.state
      | _ => state
    }

  pure def resolveSaveGatedShieldReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match saveGatedShieldReactionCandidate(frame) {
              | NoSaveGatedShieldReactionCandidate => state
              | HasSaveGatedShieldReactionCandidate(shieldFrame) =>
                  resolveSaveGatedShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }

  pure def declineSaveGatedShieldReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match saveGatedShieldReactionCandidate(frame) {
              | NoSaveGatedShieldReactionCandidate => state
              | HasSaveGatedShieldReactionCandidate(shieldFrame) =>
                  declineSaveGatedShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }
}
