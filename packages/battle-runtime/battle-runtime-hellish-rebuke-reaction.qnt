// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-hellish-rebuke

module battleRuntimeHellishRebukeReaction {
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
    if (hellishRebukeAfterDamageReactionEligible(
      triggerFacts,
      {
        hellishRebukeAvailable: hellishRebukeAvailable,
        reactionAvailable: reactorCanReact(state, damaged),
        spellSlotAvailable: canActorExpendSpellSlotThisTurn(state, damaged),
      },
    ))
      openReactionWindow(state, {
        trigger: AfterDamage,
        procedure: DamageInterruptionReactionProcedure,
        eligibleReactors: Set(damaged),
        offeredReactors: Set(),
        continuation: ResumeHellishRebukeAfterDamage({
          damager: damager,
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
      continuation.damaged == continuation.damager or
      continuation.slotLevel < 1 or
      not(reactorCanReact(state, continuation.damaged)) or
      not(canActorExpendSpellSlotThisTurn(state, continuation.damaged))
    )
      state
    else {
      val afterReactionSpend = spendReaction(state, continuation.damaged)
      val damagedTarget = match continuation.damager {
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
}
