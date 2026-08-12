// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell

module battleRuntimeCounterspellReactionDecision {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  type CounterspellReactionResolution =
    | CounterspellReactionState({ state: BattleState })
    | CounterspellReactionDeclinedResume({
        state: BattleState,
        counterspell: PendingCounterspellReaction,
      })
    | CounterspellReactionResume({
        state: BattleState,
        counterspell: PendingCounterspellReaction,
      })

  type CounterspellReactionContext = {
    counterspell: PendingCounterspellReaction,
  }

  type CounterspellReactionCandidate = {
    context: CounterspellReactionContext,
    continuation: CounterspellReactionContinuation,
  }

  type PendingCounterspellReactionOption =
    | NoPendingCounterspellReaction
    | HasPendingCounterspellReaction(CounterspellReactionCandidate)

  pure def pendingCounterspellReaction(
    frame: PendingReactionFrame,
  ): PendingCounterspellReactionOption =
    match frame.request {
      | SpellCastCounterspellReactionRequest(request) =>
          if (pendingReactionFrameIsCanonical(frame))
            HasPendingCounterspellReaction({
              context: {
                counterspell: request.counterspell,
              },
              continuation: request.continuation,
            })
          else
            NoPendingCounterspellReaction
      | _ => NoPendingCounterspellReaction
    }

  pure def stateAfterCounterspellContinuationResume(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): BattleState =
    if (
      counterspell.triggeringSpellUsesSlot and
        (not(pendingCounterspellTakesEffect(counterspell)) or
          not(pendingCounterspellEndsTriggeringSpell(counterspell)))
    )
      commitActorSpellSlotUse(state, counterspell.triggeringCaster)
    else
      state

  pure def stateAfterDeclinedCounterspellContinuationResume(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): BattleState =
    if (counterspell.triggeringSpellUsesSlot)
      commitActorSpellSlotUse(state, counterspell.triggeringCaster)
    else
      state

  pure def stateBeforeCounterspellContinuationResume(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): BattleState =
    if (counterspell.triggeringSpellUsesSlot)
      releasePendingActorSpellSlotUse(state, counterspell.triggeringCaster)
    else
      state

  pure def stateAfterCounterspellResolution(
    resolution: CounterspellReactionResolution,
    resumeContinuation: (BattleState) => BattleState,
  ): BattleState =
    match resolution {
      | CounterspellReactionState(data) => data.state
      | CounterspellReactionDeclinedResume(data) =>
          stateAfterDeclinedCounterspellContinuationResume(
            resumeContinuation(stateBeforeCounterspellContinuationResume(
              data.state,
              data.counterspell,
            )),
            data.counterspell,
          )
      | CounterspellReactionResume(data) =>
          stateAfterCounterspellContinuationResume(
            resumeContinuation(stateBeforeCounterspellContinuationResume(
              data.state,
              data.counterspell,
            )),
            data.counterspell,
          )
    }

  pure def declineCounterspellReaction(
    state: BattleState,
    context: CounterspellReactionContext,
  ): CounterspellReactionResolution = {
    val reactor = counterspellReactionReactor(context.counterspell)
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (reactionDecisionClosedFrame(state, afterDecision))
      CounterspellReactionDeclinedResume({
        state: afterDecision,
        counterspell: context.counterspell,
      })
    else
      CounterspellReactionState({ state: afterDecision })
  }

  pure def resolveCounterspellReaction(
    state: BattleState,
    context: CounterspellReactionContext,
  ): CounterspellReactionResolution = {
    val reactor = counterspellReactionReactor(context.counterspell)
    if (battleRuntimeReactionDecisionWasTaken(battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(SpellCast),
      BattleRuntimeCounterspellReactionProcedure,
      true,
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
    ))) {
      val afterReactionSpend = spendReaction(state, reactor)
      val afterReactionProcedure = castCounterspellReactionSpell(
        afterReactionSpend,
        context.counterspell,
      )
      val spellCastEnded = counterspellEndsSpellCastInState(
        afterReactionSpend,
        context.counterspell,
      )
      val afterDecision =
        if (spellCastEnded)
          ({ ...afterReactionProcedure, interruptStack: afterReactionProcedure.interruptStack.slice(0, afterReactionProcedure.interruptStack.length() - 1) })
        else
          stateAfterDecliningReactionOffer(
            afterReactionProcedure,
            reactor,
          )
      if (
        reactionDecisionClosedFrame(state, afterDecision) and
          not(spellCastEnded)
      )
        CounterspellReactionResume({
          state: afterDecision,
          counterspell: context.counterspell,
        })
      else
        CounterspellReactionState({ state: afterDecision })
    }
    else
      CounterspellReactionState({ state: state })
  }

}
