// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell

module battleRuntimeSaveGatedCounterspellResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCounterspellReactionDecision.* from "./battle-runtime-counterspell-reaction-decision"
  import battleRuntimeSaveGatedDamageResolution.* from "./battle-runtime-save-gated-damage-resolution"

  type SaveGatedCounterspellContinuation =
    | SaveGatedCounterspellIceKnife
    | SaveGatedCounterspellDamage

  type SaveGatedCounterspellFrame = {
    context: CounterspellReactionContext,
    continuation: SaveGatedCounterspellContinuation,
  }

  type SaveGatedCounterspellContinuationOption =
    | NoSaveGatedCounterspellContinuation
    | HasSaveGatedCounterspellContinuation(SaveGatedCounterspellFrame)

  pure def saveGatedCounterspellContinuation(
    candidate: CounterspellReactionCandidate,
  ): SaveGatedCounterspellContinuationOption =
    match candidate.continuation {
      | CounterspellResumesIceKnife =>
          HasSaveGatedCounterspellContinuation({
            context: candidate.context,
            continuation: SaveGatedCounterspellIceKnife,
          })
      | CounterspellResumesSaveGateDamage =>
          HasSaveGatedCounterspellContinuation({
            context: candidate.context,
            continuation: SaveGatedCounterspellDamage,
          })
      | _ => NoSaveGatedCounterspellContinuation
    }

  pure def resumeSaveGatedCounterspellContinuation(
    state: BattleState,
    continuation: SaveGatedCounterspellContinuation,
  ): BattleState =
    match continuation {
      | SaveGatedCounterspellIceKnife =>
          resolveIceKnife(state, 15, 10, 4, false, true, false, 6, true, true)
      | SaveGatedCounterspellDamage =>
          resolveAcidSplash(state, false, true, 4, true, true)
    }

  pure def resolveSaveGatedCounterspellReactionFrame(
    state: BattleState,
    frame: SaveGatedCounterspellFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      resolveCounterspellReaction(state, frame.context),
      resumeState => resumeSaveGatedCounterspellContinuation(
        resumeState,
        frame.continuation,
      ),
    )

  pure def resolvePendingSaveGatedCounterspellReaction(
    state: BattleState,
    candidate: CounterspellReactionCandidate,
  ): BattleState =
    match saveGatedCounterspellContinuation(candidate) {
      | NoSaveGatedCounterspellContinuation => state
      | HasSaveGatedCounterspellContinuation(saveFrame) =>
          resolveSaveGatedCounterspellReactionFrame(state, saveFrame)
    }

  pure def resolvePendingSaveGatedCounterspellFrame(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match pendingCounterspellReaction(frame) {
      | NoPendingCounterspellReaction => state
      | HasPendingCounterspellReaction(counterspellFrame) =>
          resolvePendingSaveGatedCounterspellReaction(state, counterspellFrame)
    }

  pure def resolveSaveGatedCounterspellReactionOffer(state: BattleState): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            resolvePendingSaveGatedCounterspellFrame(state, frame)
        | _ => state
      }
    }

  pure def declineSaveGatedCounterspellReactionFrame(
    state: BattleState,
    frame: SaveGatedCounterspellFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      declineCounterspellReaction(state, frame.context),
      resumeState => resumeSaveGatedCounterspellContinuation(
        resumeState,
        frame.continuation,
      ),
    )

  pure def declinePendingSaveGatedCounterspellReaction(
    state: BattleState,
    candidate: CounterspellReactionCandidate,
  ): BattleState =
    match saveGatedCounterspellContinuation(candidate) {
      | NoSaveGatedCounterspellContinuation => state
      | HasSaveGatedCounterspellContinuation(saveFrame) =>
          declineSaveGatedCounterspellReactionFrame(state, saveFrame)
    }

  pure def declinePendingSaveGatedCounterspellFrame(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match pendingCounterspellReaction(frame) {
      | NoPendingCounterspellReaction => state
      | HasPendingCounterspellReaction(counterspellFrame) =>
          declinePendingSaveGatedCounterspellReaction(state, counterspellFrame)
    }

  pure def declineSaveGatedCounterspellReactionOfferAndResume(state: BattleState): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            declinePendingSaveGatedCounterspellFrame(state, frame)
        | _ => state
      }
    }
}
