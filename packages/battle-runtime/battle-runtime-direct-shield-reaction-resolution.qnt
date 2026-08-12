// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeDirectShieldReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeShieldReactionDecision.* from "./battle-runtime-shield-reaction-decision"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield
  // RAW: .references/srd-5.2.1/Spells/Descriptions-M-P.md#Magic Missile
  // Shield's Magic Missile admission remains at the runtime SpellCast /
  // repeatedDamageAllocation boundary. This PendingReactionFrame slice has no
  // target-allocation or per-dart damage facts, so it does not invent a second
  // MagicMissileTargeted trigger or a no-op continuation here.
  type DirectShieldReactionFrame = {
    continuation: DirectSpellAttackReactionContinuation,
  }

  type DirectShieldReactionCandidate =
    | NoDirectShieldReactionCandidate
    | HasDirectShieldReactionCandidate(DirectShieldReactionFrame)

  pure def directShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): DirectShieldReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (not(shieldReactionFrameIsFreshGoblinTarget(frame)) or
              frame.trigger != AttackHit)
            NoDirectShieldReactionCandidate
          else
            match directSpellAttackReactionContinuation(frame.continuation) {
              | NoDirectSpellAttackReactionContinuation =>
                  NoDirectShieldReactionCandidate
              | HasDirectSpellAttackReactionContinuation(continuation) =>
                  HasDirectShieldReactionCandidate({
                    continuation: continuation,
                  })
            }
      | _ => NoDirectShieldReactionCandidate
    }

  pure def resumeDirectShieldReactionAfterTake(
    state: BattleState,
    continuation: DirectSpellAttackReactionContinuation,
  ): BattleState =
    resumeDirectSpellAttackReactionContinuationAfterShieldOffer(state, continuation)

  pure def resumeDirectShieldReactionAfterDecline(
    state: BattleState,
    continuation: DirectSpellAttackReactionContinuation,
  ): BattleState =
    resumeDirectSpellAttackReactionContinuationAfterShieldOffer(state, continuation)

  pure def resolveDirectShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectShieldReactionFrame,
  ): BattleState = {
    val decision = takeShieldReactionDecision(state, reactor)
    match decision {
      | ShieldReactionDecisionTakenClosed(data) =>
          resumeDirectShieldReactionAfterTake(data.state, frame.continuation)
      | ShieldReactionDecisionTakenOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def declineDirectShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectShieldReactionFrame,
  ): BattleState = {
    val decision = declineShieldReactionDecision(
      state,
      reactor,
    )
    match decision {
      | ShieldReactionDecisionDeclinedClosed(data) =>
          resumeDirectShieldReactionAfterDecline(data.state, frame.continuation)
      | ShieldReactionDecisionDeclinedOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def resolveDirectShieldReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match directShieldReactionCandidate(frame) {
              | NoDirectShieldReactionCandidate => state
              | HasDirectShieldReactionCandidate(shieldFrame) =>
                  resolveDirectShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }

  pure def declineDirectShieldReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match directShieldReactionCandidate(frame) {
              | NoDirectShieldReactionCandidate => state
              | HasDirectShieldReactionCandidate(shieldFrame) =>
                  declineDirectShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }
}
