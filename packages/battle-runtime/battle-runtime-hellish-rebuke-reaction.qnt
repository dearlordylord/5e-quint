// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-hellish-rebuke

module battleRuntimeHellishRebukeReaction {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveGatedDamageTarget.* from "./battle-runtime-save-gated-damage-target"

  pure def hellishRebukeAfterDamageReactionEligible(
    triggerFacts: HellishRebukeAfterDamageTrigger,
    availability: HellishRebukeAfterDamageAvailability,
  ): bool =
    match triggerFacts {
      | HellishRebukeDamageFromVisibleCreatureWithin60Feet =>
          availability.hellishRebukeAvailable and
            availability.reactionAvailable and
            availability.spellSlotAvailable
      | _ => false
    }

  pure def openHellishRebukeAfterDamageReactionWindow(
    state: BattleState,
    damager: Actor,
    damaged: Actor,
    triggerFacts: HellishRebukeAfterDamageTrigger,
    hellishRebukeAvailable: bool,
    slotLevel: int,
  ): BattleState =
    if (
      damager != damaged and
      slotLevel >= 1 and
      hellishRebukeAfterDamageReactionEligible(
        triggerFacts,
        {
          hellishRebukeAvailable: hellishRebukeAvailable,
          reactionAvailable: reactorCanReact(state, damaged),
          spellSlotAvailable: canActorExpendSpellSlotThisTurn(state, damaged),
        },
      )
    )
      openReactionWindow(state, {
        request: AfterDamageHellishRebukeReactionRequest({
          damaged: damaged,
          slotLevel: slotLevel,
        }),
      })
    else
      state

  pure def hellishRebukeDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else 2 + (slotLevel - 1)

  pure def resolveHellishRebukeAfterDamage(
    state: BattleState,
    continuation: HellishRebukeAfterDamageContinuation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      continuation.slotLevel < 1 or
      not(reactorCanReact(state, continuation.damaged)) or
      not(canActorExpendSpellSlotThisTurn(state, continuation.damaged))
    )
      state
    else {
      val afterReactionSpend = spendReaction(state, continuation.damaged)
      val damagedTarget = match opposingActor(continuation.damaged) {
        | Fighter => {
            ...afterReactionSpend,
            fighter: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.fighter,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
        | Goblin => {
            ...afterReactionSpend,
            goblin: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.goblin,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
      }
      commitActorSpellSlotUse(damagedTarget, continuation.damaged)
    }

  type PendingHellishRebukeReactionOption =
    | NoPendingHellishRebukeReaction
    | HasPendingHellishRebukeReaction(HellishRebukeAfterDamageContinuation)

  pure def pendingHellishRebukeReaction(
    frame: PendingReactionFrame,
  ): PendingHellishRebukeReactionOption =
    match frame.request {
      | AfterDamageHellishRebukeReactionRequest(continuation) =>
          HasPendingHellishRebukeReaction(continuation)
      | _ => NoPendingHellishRebukeReaction
    }

  pure def resolveHellishRebukeReactionFrame(
    state: BattleState,
    frame: PendingReactionFrame,
    continuation: HellishRebukeAfterDamageContinuation,
    reactor: Actor,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val decision = battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(AfterDamage),
      BattleRuntimeAfterDamageSpellReactionProcedure,
      reactor == continuation.damaged and reactionFrameCanOffer(frame, reactor),
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
    )
    match decision {
      | BattleRuntimeTookReaction(_) =>
          stateAfterDecliningReactionOffer(
            resolveHellishRebukeAfterDamage(
              state,
              continuation,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
            ),
            reactor,
          )
      | _ => state
    }
  }

  pure def resolveHellishRebukeReactionOffer(
    state: BattleState,
    reactor: Actor,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match pendingHellishRebukeReaction(frame) {
              | NoPendingHellishRebukeReaction => state
              | HasPendingHellishRebukeReaction(continuation) =>
                  resolveHellishRebukeReactionFrame(
                    state,
                    frame,
                    continuation,
                    reactor,
                    savingThrowSucceeded,
                    damageRoll,
                    concentrationSaveSucceeded,
                  )
            }
        | _ => state
      }

  pure def declineHellishRebukeReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            match pendingHellishRebukeReaction(frame) {
              | NoPendingHellishRebukeReaction => state
              | HasPendingHellishRebukeReaction(_) =>
                  stateAfterDecliningReactionOffer(state, reactor)
            }
        | _ => state
      }
}
