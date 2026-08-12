// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell

module battleRuntimeWeaponCounterspellResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCounterspellReactionDecision.* from "./battle-runtime-counterspell-reaction-decision"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  type WeaponCounterspellFrame = {
    context: CounterspellReactionContext,
  }

  type WeaponCounterspellContinuationOption =
    | NoWeaponCounterspellContinuation
    | HasWeaponCounterspellContinuation(WeaponCounterspellFrame)

  pure def weaponCounterspellContinuation(
    candidate: CounterspellReactionCandidate,
  ): WeaponCounterspellContinuationOption =
    match candidate.continuation {
      | CounterspellResumesTrueStrikeWeaponAttack =>
          HasWeaponCounterspellContinuation({
            context: candidate.context,
          })
      | _ => NoWeaponCounterspellContinuation
    }

  pure def resumeWeaponCounterspellContinuation(state: BattleState): BattleState =
    resolveTrueStrikeWeaponAttack(state, 15, 10, 4, 5, 3, 5, Radiant, Slashing, true)

  pure def resolveWeaponCounterspellReactionFrame(
    state: BattleState,
    frame: WeaponCounterspellFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      resolveCounterspellReaction(state, frame.context),
      resumeState => resumeWeaponCounterspellContinuation(resumeState),
    )

  pure def resolvePendingWeaponCounterspellReaction(
    state: BattleState,
    candidate: CounterspellReactionCandidate,
  ): BattleState =
    match weaponCounterspellContinuation(candidate) {
      | NoWeaponCounterspellContinuation => state
      | HasWeaponCounterspellContinuation(weaponFrame) =>
          resolveWeaponCounterspellReactionFrame(state, weaponFrame)
    }

  pure def resolvePendingWeaponCounterspellFrame(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match pendingCounterspellReaction(frame) {
      | NoPendingCounterspellReaction => state
      | HasPendingCounterspellReaction(counterspellFrame) =>
          resolvePendingWeaponCounterspellReaction(state, counterspellFrame)
    }

  pure def resolveWeaponCounterspellReactionOffer(state: BattleState): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            resolvePendingWeaponCounterspellFrame(state, frame)
        | _ => state
      }
    }

  pure def declineWeaponCounterspellReactionFrame(
    state: BattleState,
    frame: WeaponCounterspellFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      declineCounterspellReaction(state, frame.context),
      resumeState => resumeWeaponCounterspellContinuation(resumeState),
    )

  pure def declinePendingWeaponCounterspellReaction(
    state: BattleState,
    candidate: CounterspellReactionCandidate,
  ): BattleState =
    match weaponCounterspellContinuation(candidate) {
      | NoWeaponCounterspellContinuation => state
      | HasWeaponCounterspellContinuation(weaponFrame) =>
          declineWeaponCounterspellReactionFrame(state, weaponFrame)
    }

  pure def declinePendingWeaponCounterspellFrame(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match pendingCounterspellReaction(frame) {
      | NoPendingCounterspellReaction => state
      | HasPendingCounterspellReaction(counterspellFrame) =>
          declinePendingWeaponCounterspellReaction(state, counterspellFrame)
    }

  pure def declineWeaponCounterspellReactionOfferAndResume(
    state: BattleState,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            declinePendingWeaponCounterspellFrame(state, frame)
        | _ => state
      }
    }

}
