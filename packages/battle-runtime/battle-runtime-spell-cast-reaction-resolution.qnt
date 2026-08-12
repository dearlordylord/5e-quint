// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell

module battleRuntimeSpellCastReactionResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeCounterspellReactionDecision.* from "./battle-runtime-counterspell-reaction-decision"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  type DirectSpellReactionFrame = {
    context: CounterspellReactionContext,
    continuation: DirectSpellAttackReactionContinuation,
  }

  type DirectSpellReactionFrameOption =
    | NoDirectSpellReactionFrame
    | HasDirectSpellReactionFrame(DirectSpellReactionFrame)

  type DirectSpellReactionCandidate =
    | NoDirectSpellReactionCandidate
    | HasDirectSpellReactionCandidate(DirectSpellReactionFrame)

  pure def directSpellReactionCandidate(
    frame: PendingReactionFrame,
  ): DirectSpellReactionCandidate =
    match frame.request {
      | SpellCastCounterspellReactionRequest(request) =>
          if (not(pendingReactionFrameIsCanonical(frame)))
            NoDirectSpellReactionCandidate
          else
            match directSpellAttackContinuationForCounterspell(request.continuation) {
              | NoDirectSpellAttackReactionContinuation =>
                  NoDirectSpellReactionCandidate
              | HasDirectSpellAttackReactionContinuation(continuation) =>
                  HasDirectSpellReactionCandidate({
                    context: {
                      counterspell: request.counterspell,
                      eligibleReactors: request.eligibleReactors,
                      offeredReactors: frame.offeredReactors,
                    },
                    continuation: continuation,
                  })
            }
      | _ => NoDirectSpellReactionCandidate
    }

  pure def directSpellReactionFrame(
    candidate: DirectSpellReactionCandidate,
  ): DirectSpellReactionFrameOption =
    match candidate {
      | NoDirectSpellReactionCandidate => NoDirectSpellReactionFrame
      | HasDirectSpellReactionCandidate(frame) =>
          HasDirectSpellReactionFrame(frame)
    }

  pure def declineDirectSpellReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectSpellReactionFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      declineCounterspellReaction(state, reactor, frame.context),
      resumeState => resumeDirectSpellAttackReactionContinuation(
        resumeState,
        frame.continuation,
      ),
    )

  pure def declineDirectSpellReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match directSpellReactionFrame(directSpellReactionCandidate(frame)) {
              | NoDirectSpellReactionFrame => state
              | HasDirectSpellReactionFrame(directFrame) =>
                  declineDirectSpellReactionFrame(state, reactor, directFrame)
            }
        | _ => state
      }
    }

  pure def resolveDirectSpellReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectSpellReactionFrame,
  ): BattleState =
    stateAfterCounterspellResolution(
      resolveCounterspellReaction(state, reactor, frame.context),
      resumeState => resumeDirectSpellAttackReactionContinuation(
        resumeState,
        frame.continuation,
      ),
    )

  pure def resolveDirectSpellReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match directSpellReactionFrame(directSpellReactionCandidate(frame)) {
              | NoDirectSpellReactionFrame => state
              | HasDirectSpellReactionFrame(directFrame) =>
                  resolveDirectSpellReactionFrame(state, reactor, directFrame)
            }
        | _ => state
      }
    }
}
