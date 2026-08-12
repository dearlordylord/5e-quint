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
          damaged: Fighter,
          slotLevel: 1,
        }),
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

  run test_hellish_rebuke_after_damage_reaction_uses_specific_typed_owner = {
    // After-damage spell Reactions use their specific typed owner; there is no
    // generic no-op Reaction procedure that can consume an unrelated reactor.
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val resolved = resolveHellishRebukeReactionOffer(
      awaiting,
      Fighter,
      false,
      3,
      true,
    )
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(resolved.goblin.hp == 7),
    }
  }

  run test_hellish_rebuke_decline_closes_frame_without_spending_reaction_slot_or_damage = {
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val declined = declineHellishRebukeReactionOffer(awaiting, Fighter)
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(declined.interruptStack == []),
      assert(declined.fighter == initialState.fighter),
      assert(declined.goblin == initialState.goblin),
      assert(not(battleActorHasCommittedSpellSlotUse(declined, Fighter))),
    }
  }

  run test_hellish_rebuke_rejects_incapacitated_or_terminal_reactor = {
    val incapacitated = {
      ...initialState,
      fighter: { ...initialState.fighter, incapacitated: true },
    }
    val terminal = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        hp: 0,
        deathFailures: 3,
      },
    }
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val incapacitatedAwaiting = {
      ...awaiting,
      fighter: { ...awaiting.fighter, incapacitated: true },
    }
    val terminalAwaiting = {
      ...awaiting,
      fighter: {
        ...awaiting.fighter,
        hp: 0,
        deathFailures: 3,
      },
    }
    all {
      assert(openHellishRebukeAfterDamageReactionWindow(incapacitated, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == incapacitated),
      assert(openHellishRebukeAfterDamageReactionWindow(terminal, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == terminal),
      assert(resolveHellishRebukeReactionOffer(incapacitatedAwaiting, Fighter, false, 3, true) == incapacitatedAwaiting),
      assert(resolveHellishRebukeReactionOffer(terminalAwaiting, Fighter, false, 3, true) == terminalAwaiting),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_rejects_unavailable_or_invalid_slot = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val continuation = { damaged: Fighter, slotLevel: 1 }
    all {
      assert(resolveHellishRebukeAfterDamage(noReaction, continuation, false, 3, true) == noReaction),
      assert(resolveHellishRebukeAfterDamage(noSlot, continuation, false, 3, true) == noSlot),
      assert(resolveHellishRebukeAfterDamage(initialState, { damaged: Fighter, slotLevel: 0 }, false, 3, true) == initialState),
    }
  }

}
