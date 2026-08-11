// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell

module battleRuntimeSpellCastReactionResolution {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeCounterspellReactionDecision.* from "./battle-runtime-counterspell-reaction-decision"

  type ShieldDirectSpellReactionFrame = {
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: DirectSpellAttackReactionContinuation,
  }

  type DirectSpellReactionFrame =
    | ShieldDirectSpellReaction(ShieldDirectSpellReactionFrame)
    | CounterspellDirectSpellReaction({
        context: CounterspellReactionContext,
        continuation: DirectSpellAttackReactionContinuation,
      })

  type DirectSpellReactionFrameOption =
    | NoDirectSpellReactionFrame
    | HasDirectSpellReactionFrame(DirectSpellReactionFrame)

  type DirectSpellReactionCandidate =
    | NoDirectSpellReactionCandidate
    | ShieldDirectSpellReactionCandidate({
        eligibleReactors: Set[Actor],
        offeredReactors: Set[Actor],
        continuation: ReactionContinuation,
      })
    | CounterspellDirectSpellReactionCandidate(CounterspellReactionCandidate)

  pure def directSpellReactionCandidate(
    frame: PendingReactionFrame,
  ): DirectSpellReactionCandidate =
    match frame.procedure {
      | ShieldReactionProcedure =>
          if (frame.trigger == AttackHit)
            ShieldDirectSpellReactionCandidate({
              eligibleReactors: frame.eligibleReactors,
              offeredReactors: frame.offeredReactors,
              continuation: frame.continuation,
            })
          else
            NoDirectSpellReactionCandidate
      | CounterspellReactionProcedure(counterspell) =>
          if (reactionProcedureMatchesTrigger(frame.trigger, frame.procedure))
            CounterspellDirectSpellReactionCandidate({
              context: {
                counterspell: counterspell,
                eligibleReactors: frame.eligibleReactors,
                offeredReactors: frame.offeredReactors,
              },
              continuation: frame.continuation,
            })
          else
            NoDirectSpellReactionCandidate
      | _ => NoDirectSpellReactionCandidate
    }

  pure def shieldDirectSpellReactionFrame(
    candidate: {
      eligibleReactors: Set[Actor],
      offeredReactors: Set[Actor],
      continuation: ReactionContinuation,
    },
  ): DirectSpellReactionFrameOption =
    match directSpellAttackReactionContinuation(candidate.continuation) {
      | NoDirectSpellAttackReactionContinuation => NoDirectSpellReactionFrame
      | HasDirectSpellAttackReactionContinuation(continuation) =>
          HasDirectSpellReactionFrame(ShieldDirectSpellReaction({
            eligibleReactors: candidate.eligibleReactors,
            offeredReactors: candidate.offeredReactors,
            continuation: continuation,
          }))
    }

  pure def counterspellDirectSpellReactionFrame(
    candidate: CounterspellReactionCandidate,
  ): DirectSpellReactionFrameOption =
    match directSpellAttackReactionContinuation(candidate.continuation) {
      | NoDirectSpellAttackReactionContinuation => NoDirectSpellReactionFrame
      | HasDirectSpellAttackReactionContinuation(continuation) =>
          HasDirectSpellReactionFrame(CounterspellDirectSpellReaction({
            context: candidate.context,
            continuation: continuation,
          }))
    }

  pure def directSpellReactionFrame(
    candidate: DirectSpellReactionCandidate,
  ): DirectSpellReactionFrameOption =
    match candidate {
      | NoDirectSpellReactionCandidate => NoDirectSpellReactionFrame
      | ShieldDirectSpellReactionCandidate(shield) =>
          shieldDirectSpellReactionFrame(shield)
      | CounterspellDirectSpellReactionCandidate(counterspell) =>
          counterspellDirectSpellReactionFrame(counterspell)
    }

  pure def declineDirectSpellReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectSpellReactionFrame,
  ): BattleState =
    match frame {
      | CounterspellDirectSpellReaction(counterspell) =>
            stateAfterCounterspellResolution(
              declineCounterspellReaction(state, reactor, counterspell.context),
              resumeState => resumeDirectSpellAttackReactionContinuation(
                resumeState,
                counterspell.continuation,
              ),
            )
      | ShieldDirectSpellReaction(shield) => {
          val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
          if (reactionDecisionClosedFrame(state, afterDecision))
            resumeDirectSpellAttackReactionContinuation(
              afterDecision,
              shield.continuation,
            )
          else
            afterDecision
        }
    }

  pure def declineDirectSpellReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            declinePendingDirectSpellReaction(state, reactor, frame)
        | _ => state
      }
    }

  pure def declinePendingDirectSpellReaction(
    state: BattleState,
    reactor: Actor,
    frame: PendingReactionFrame,
  ): BattleState =
    match directSpellReactionFrame(directSpellReactionCandidate(frame)) {
      | NoDirectSpellReactionFrame => state
      | HasDirectSpellReactionFrame(directFrame) =>
          declineDirectSpellReactionFrame(state, reactor, directFrame)
    }

  pure def resolveShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
    frame: ShieldDirectSpellReactionFrame,
  ): BattleState = {
    val decision = battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(AttackHit),
      battleRuntimeReactionProcedure(ShieldReactionProcedure),
      frame.eligibleReactors.contains(reactor),
      frame.offeredReactors.contains(reactor),
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
      reactionOfferCompletesFrame(
        frame.eligibleReactors,
        frame.offeredReactors,
        reactor,
      ),
    )
    match decision {
      | BattleRuntimeTookReaction(_) => {
          val afterReactionSpend = spendReaction(state, reactor)
          val afterReactionProcedure = castShieldReactionSpell(
            afterReactionSpend,
            reactor,
          )
          val afterDecision =
            stateAfterDecliningReactionOffer(
              afterReactionProcedure,
              reactor,
            )
          if (reactionDecisionClosedFrame(state, afterDecision))
            resumeDirectSpellAttackReactionContinuation(
              afterDecision,
              frame.continuation,
            )
          else
            afterDecision
        }
      | _ => state
    }
  }

  pure def resolveDirectSpellReactionFrame(
    state: BattleState,
    reactor: Actor,
    frame: DirectSpellReactionFrame,
  ): BattleState =
    match frame {
      | CounterspellDirectSpellReaction(counterspell) =>
            stateAfterCounterspellResolution(
              resolveCounterspellReaction(state, reactor, counterspell.context),
              resumeState => resumeDirectSpellAttackReactionContinuation(
                resumeState,
                counterspell.continuation,
              ),
            )
      | ShieldDirectSpellReaction(shield) =>
          resolveShieldReactionDecision(state, reactor, shield)
    }

  pure def resolveDirectSpellAttackReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            resolvePendingDirectSpellReaction(state, reactor, frame)
        | _ => state
      }
    }

  pure def resolvePendingDirectSpellReaction(
    state: BattleState,
    reactor: Actor,
    frame: PendingReactionFrame,
  ): BattleState =
    match directSpellReactionFrame(directSpellReactionCandidate(frame)) {
      | NoDirectSpellReactionFrame => state
      | HasDirectSpellReactionFrame(directFrame) =>
          resolveDirectSpellReactionFrame(state, reactor, directFrame)
    }
}
