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
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: WeaponShieldReactionContinuation,
  }

  type WeaponShieldReactionCandidate =
    | NoWeaponShieldReactionCandidate
    | HasWeaponShieldReactionCandidate(WeaponShieldReactionFrame)

  pure def weaponShieldReactionCandidate(
    frame: PendingReactionFrame,
  ): WeaponShieldReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (shieldReactionFrameIsFreshGoblinTarget(frame) and
              frame.trigger == AttackHit and
              frame.continuation == ResumeTrueStrikeWeaponAttack)
            HasWeaponShieldReactionCandidate({
              eligibleReactors: frame.eligibleReactors,
              offeredReactors: frame.offeredReactors,
              continuation: WeaponShieldTrueStrikeAttack,
            })
          else
            NoWeaponShieldReactionCandidate
      | _ => NoWeaponShieldReactionCandidate
    }

  pure def resumeWeaponShieldReactionContinuation(
    state: BattleState,
    continuation: WeaponShieldReactionContinuation,
  ): BattleState =
    match continuation {
      | WeaponShieldTrueStrikeAttack =>
          resolveTrueStrikeWeaponAttack(
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
          )
    }

  pure def resolveWeaponShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: WeaponShieldReactionFrame,
  ): BattleState =
    match takeShieldReactionDecision(
      state,
      reactor,
      frame.eligibleReactors,
      frame.offeredReactors,
    ) {
      | ShieldReactionDecisionTaken(data) =>
          if (data.frameClosed)
            resumeWeaponShieldReactionContinuation(data.state, frame.continuation)
          else
            data.state
      | _ => state
    }

  pure def declineWeaponShieldReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: WeaponShieldReactionFrame,
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
              resumeState => resumeWeaponShieldReactionContinuation(
                resumeState,
                frame.continuation,
              ),
            )
          else
            data.state
      | _ => state
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
