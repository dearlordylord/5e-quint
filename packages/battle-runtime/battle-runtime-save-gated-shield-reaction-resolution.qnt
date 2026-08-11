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
              continuation: SaveGatedShieldIceKnife,
            })
          else
            NoSaveGatedShieldReactionCandidate
      | _ => NoSaveGatedShieldReactionCandidate
    }

  pure def resumeSaveGatedShieldReactionAfterTake(
    state: BattleState,
    continuation: SaveGatedShieldReactionContinuation,
  ): BattleState =
    resumeSaveGatedShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      IceKnifeShieldOfferConsidered,
    )

  pure def resumeSaveGatedShieldReactionAfterDecline(
    state: BattleState,
    continuation: SaveGatedShieldReactionContinuation,
  ): BattleState =
    resumeSaveGatedShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      IceKnifeShieldOfferConsidered,
    )

  pure def resumeSaveGatedShieldReactionAtShieldOfferBoundary(
    state: BattleState,
    continuation: SaveGatedShieldReactionContinuation,
    shieldOfferBoundary: IceKnifeShieldOfferBoundary,
  ): BattleState =
    match continuation {
      | SaveGatedShieldIceKnife =>
          resolveIceKnifeWithMirrorImageDuplicateRollAtShieldOfferBoundary(
            state,
            15,
            10,
            4,
            false,
            true,
            false,
            6,
            true,
            true,
            0,
            false,
            shieldOfferBoundary,
          )
    }

  pure def resolveSaveGatedShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: SaveGatedShieldReactionFrame,
  ): BattleState = {
    val decision = takeShieldReactionDecision(state, reactor)
    match decision {
      | ShieldReactionDecisionTaken(ShieldReactionDecisionFrameClosed(data)) =>
          resumeSaveGatedShieldReactionAfterTake(data.state, frame.continuation)
      | ShieldReactionDecisionTaken(ShieldReactionDecisionFrameOpen(data)) =>
          data.state
      | _ => state
    }
  }

  pure def declineSaveGatedShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: SaveGatedShieldReactionFrame,
  ): BattleState = {
    val decision = declineShieldReactionDecision(
      state,
      reactor,
    )
    match decision {
      | ShieldReactionDecisionDeclined(ShieldReactionDecisionFrameClosed(data)) =>
          resumeSaveGatedShieldReactionAfterDecline(data.state, frame.continuation)
      | ShieldReactionDecisionDeclined(ShieldReactionDecisionFrameOpen(data)) =>
          data.state
      | _ => state
    }
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
