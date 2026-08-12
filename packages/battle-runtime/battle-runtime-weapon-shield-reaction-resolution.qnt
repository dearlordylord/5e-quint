// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeWeaponShieldReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeShieldReactionDecision.* from "./battle-runtime-shield-reaction-decision"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield
  type WeaponShieldReactionContinuation =
    | WeaponShieldTrueStrikeAttack

  type WeaponShieldReactionFrame = {
    continuation: WeaponShieldReactionContinuation,
  }

  type WeaponShieldReactionCandidate =
    | NoWeaponShieldReactionCandidate
    | HasWeaponShieldReactionCandidate(WeaponShieldReactionFrame)

  pure def weaponShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): WeaponShieldReactionCandidate =
    match frame.request {
      | AttackHitShieldReactionRequest(request) =>
          if (shieldReactionFrameIsFreshGoblinTarget(frame) and
              request.continuation == ShieldResumesTrueStrikeWeaponAttack)
            HasWeaponShieldReactionCandidate({
              continuation: WeaponShieldTrueStrikeAttack,
            })
          else
            NoWeaponShieldReactionCandidate
      | _ => NoWeaponShieldReactionCandidate
    }

  pure def resumeWeaponShieldReactionAfterTake(
    state: BattleState,
    continuation: WeaponShieldReactionContinuation,
  ): BattleState =
    resumeWeaponShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      TrueStrikeShieldOfferConsidered,
    )

  pure def resumeWeaponShieldReactionAfterDecline(
    state: BattleState,
    continuation: WeaponShieldReactionContinuation,
  ): BattleState =
    resumeWeaponShieldReactionAtShieldOfferBoundary(
      state,
      continuation,
      TrueStrikeShieldOfferConsidered,
    )

  pure def resumeWeaponShieldReactionAtShieldOfferBoundary(
    state: BattleState,
    continuation: WeaponShieldReactionContinuation,
    shieldOfferBoundary: TrueStrikeShieldOfferBoundary,
  ): BattleState =
    match continuation {
      | WeaponShieldTrueStrikeAttack =>
          resolveTrueStrikeWeaponAttackAtShieldOfferBoundary(
            state,
            15,
            10,
            4,
            5,
            3,
            5,
            Radiant,
            Slashing,
            true,
            shieldOfferBoundary,
          )
    }

  pure def resolveWeaponShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: WeaponShieldReactionFrame,
  ): BattleState = {
    val decision = takeShieldReactionDecision(state, reactor)
    match decision {
      | ShieldReactionDecisionTakenClosed(data) =>
          resumeWeaponShieldReactionAfterTake(data.state, frame.continuation)
      | ShieldReactionDecisionTakenOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def declineWeaponShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: WeaponShieldReactionFrame,
  ): BattleState = {
    val decision = declineShieldReactionDecision(
      state,
      reactor,
    )
    match decision {
      | ShieldReactionDecisionDeclinedClosed(data) =>
          resumeWeaponShieldReactionAfterDecline(data.state, frame.continuation)
      | ShieldReactionDecisionDeclinedOpen(data) =>
          data.state
      | _ => state
    }
  }

  pure def resolveWeaponShieldReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match weaponShieldReactionCandidate(frame) {
              | NoWeaponShieldReactionCandidate => state
              | HasWeaponShieldReactionCandidate(shieldFrame) =>
                  resolveWeaponShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }

  pure def declineWeaponShieldReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match weaponShieldReactionCandidate(frame) {
              | NoWeaponShieldReactionCandidate => state
              | HasWeaponShieldReactionCandidate(shieldFrame) =>
                  declineWeaponShieldReactionFrame(state, reactor, shieldFrame)
            }
        | _ => state
      }
    }
}
