// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeLightShieldReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeShieldReactionDecision.* from "./battle-runtime-shield-reaction-decision"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield
  type LightShieldReactionContinuation =
    | LightShieldProduceFlameHurl
    | LightShieldFlameBladeAttack

  type LightShieldReactionFrame = {
    continuation: LightShieldReactionContinuation,
  }

  type LightShieldReactionCandidate =
    | NoLightShieldReactionCandidate
    | HasLightShieldReactionCandidate(LightShieldReactionFrame)

  pure def lightShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): LightShieldReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (not(shieldReactionFrameIsFreshGoblinTarget(frame)) or
              frame.trigger != AttackHit)
            NoLightShieldReactionCandidate
          else
            match frame.continuation {
              | ResumeProduceFlameHurl =>
                  HasLightShieldReactionCandidate({
                    continuation: LightShieldProduceFlameHurl,
                  })
              | ResumeFlameBladeAttack =>
                  HasLightShieldReactionCandidate({
                    continuation: LightShieldFlameBladeAttack,
                  })
              | _ => NoLightShieldReactionCandidate
            }
      | _ => NoLightShieldReactionCandidate
    }

  pure def resumeLightShieldReactionAfterTake(
    state: BattleState,
    continuation: LightShieldReactionContinuation,
  ): BattleState =
    resumeLightShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      LightShieldOfferConsidered,
    )

  pure def resumeLightShieldReactionAfterDecline(
    state: BattleState,
    continuation: LightShieldReactionContinuation,
  ): BattleState =
    resumeLightShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      LightShieldOfferConsidered,
    )

  pure def resumeLightShieldReactionAtShieldOfferBoundary(
    state: BattleState,
    continuation: LightShieldReactionContinuation,
    shieldOfferBoundary: LightShieldOfferBoundary,
  ): BattleState =
    match continuation {
      | LightShieldProduceFlameHurl =>
          resolveProduceFlameHurlWithMirrorImageDuplicateRollAtShieldOfferBoundary(
            state,
            15,
            10,
            5,
            true,
            0,
            false,
            shieldOfferBoundary,
          )
      | LightShieldFlameBladeAttack =>
          resolveFlameBladeAttackAtShieldOfferBoundary(
            state,
            15,
            10,
            6,
            true,
            shieldOfferBoundary,
          )
    }

  pure def resolveLightShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: LightShieldReactionFrame,
  ): BattleState = {
    val decision = takeShieldReactionDecision(state, reactor)
    match decision {
      | ShieldReactionDecisionTakenClosed(data) =>
          resumeLightShieldReactionAfterTake(data.state, frame.continuation)
      | ShieldReactionDecisionTakenOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def declineLightShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: LightShieldReactionFrame,
  ): BattleState = {
    val decision = declineShieldReactionDecision(
      state,
      reactor,
    )
    match decision {
      | ShieldReactionDecisionDeclinedClosed(data) =>
          resumeLightShieldReactionAfterDecline(data.state, frame.continuation)
      | ShieldReactionDecisionDeclinedOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def resolveLightShieldReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match lightShieldReactionCandidate(frame) {
              | NoLightShieldReactionCandidate => state
              | HasLightShieldReactionCandidate(shieldFrame) =>
                  resolveLightShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }

  pure def declineLightShieldReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match lightShieldReactionCandidate(frame) {
              | NoLightShieldReactionCandidate => state
              | HasLightShieldReactionCandidate(shieldFrame) =>
                  declineLightShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }
}
