// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-hellish-rebuke

module battleRuntimeHellishRebukeTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeHellishRebukeReaction.* from "./battle-runtime-hellish-rebuke-reaction"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_hellish_rebuke_after_damage_reaction_opens_srd_window_with_continuation_facts = {
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        request: AfterDamageHellishRebukeReactionRequest({
          damager: Goblin,
          damaged: Fighter,
          slotLevel: 1,
        }),
        offeredReactors: Set(),
      })),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_requires_srd_trigger_and_availability_facts = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnWindow = openHellishRebukeAfterDamageReactionWindow(
      goblinTurnSpentSlot,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val available = {
      hellishRebukeAvailable: true,
      reactionAvailable: true,
      spellSlotAvailable: true,
    }
    all {
      assert(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, available)),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeNoDamageTaken, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageNotFromCreature, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerNotVisible, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerOutside60Feet, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, hellishRebukeAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, reactionAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, spellSlotAvailable: false }))),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeNoDamageTaken, true, 1) == initialState),
      assert(openHellishRebukeAfterDamageReactionWindow(noReaction, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noReaction),
      assert(openHellishRebukeAfterDamageReactionWindow(noSlot, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noSlot),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, false, 1) == initialState),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Fighter, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == initialState),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 0) == initialState),
      assert(offTurnWindow.interruptStack.length() == 1),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_resolves_save_damage_and_spend = {
    val failedWindow = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      2,
    )
    val failedSave = resolveHellishRebukeReactionOffer(
      failedWindow,
      Fighter,
      false,
      3,
      true,
    )
    val successfulWindow = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      2,
    )
    val successfulSave = resolveHellishRebukeReactionOffer(
      successfulWindow,
      Fighter,
      true,
      5,
      true,
    )
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnWindow = openHellishRebukeAfterDamageReactionWindow(
      goblinTurnSpentSlot,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      2,
    )
    val offTurnResolved = resolveHellishRebukeReactionOffer(
      offTurnWindow,
      Fighter,
      false,
      3,
      true,
    )
    all {
      assert(hellishRebukeDamageDice(1) == 2),
      assert(hellishRebukeDamageDice(2) == 3),
      assert(failedSave.goblin.hp == 7),
      assert(failedSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failedSave, Fighter)),
      assert(successfulSave.goblin.hp == 8),
      assert(successfulSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(successfulSave, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
      assert(failedSave.interruptStack == []),
      assert(successfulSave.interruptStack == []),
      assert(offTurnResolved.interruptStack == []),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_rejects_invalid_continuation = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val continuation = { damager: Goblin, damaged: Fighter, slotLevel: 1 }
    all {
      assert(resolveHellishRebukeAfterDamage(noReaction, continuation, false, 3, true) == noReaction),
      assert(resolveHellishRebukeAfterDamage(noSlot, continuation, false, 3, true) == noSlot),
      assert(resolveHellishRebukeAfterDamage(initialState, { damager: Fighter, damaged: Fighter, slotLevel: 1 }, false, 3, true) == initialState),
      assert(resolveHellishRebukeAfterDamage(initialState, { damager: Goblin, damaged: Fighter, slotLevel: 0 }, false, 3, true) == initialState),
    }
  }

}
