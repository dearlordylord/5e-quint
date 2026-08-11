// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleet-storm-area-hazard

module battleRuntimeSleetStormAreaHazardTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeSleetStormAreaHazard.* from "./battle-runtime-sleet-storm-area-hazard"

  run test_sleet_storm_records_area_hazard_and_concentration = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    all {
      assert(resolved.fighter.activeEffects.contains(sleetStormAreaHazard(sleetStormAreaId))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_sleet_storm_requires_third_level_or_higher_slot = {
    val tooLow = resolveSleetStorm(initialState, sleetStormAreaId, 2)
    val supported = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    all {
      assert(not(tooLow.fighter.activeEffects.contains(sleetStormAreaHazard(sleetStormAreaId)))),
      assert(supported.fighter.activeEffects.contains(sleetStormAreaHazard(sleetStormAreaId))),
    }
  }

  run test_sleet_storm_area_difficult_terrain_and_heavy_obscurement = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    val removedArea = removeSleetStormArea(resolved, sleetStormAreaId)
    all {
      assert(sleetStormDifficultTerrainMovementCost(resolved, sleetStormAreaId, 10, 5) == 15),
      assert(sleetStormDifficultTerrainMovementCost(removedArea, sleetStormAreaId, 10, 5) == 0),
      assert(sleetStormAreaHazardSightObscurement(resolved, sleetStormAreaId) == HeavilyObscuredSight),
      assert(sleetStormAreaHazardSightObscurement(removedArea, sleetStormAreaId) == UnobscuredSight),
    }
  }

  run test_sleet_storm_entry_save_prones_and_breaks_concentration_once_per_turn = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    val concentratingGoblin = {
      ...resolved,
      goblin: {
        ...resolved.goblin,
        concentrating: true,
        activeEffects: Set(sleetStormAreaHazard(99)),
      },
    }
    val entryTriggerFact = SleetStormFirstEntryOnTurn({ areaId: sleetStormAreaId })
    val entryFailed = resolveSleetStormAreaHazardSave(concentratingGoblin, Goblin, entryTriggerFact, false)
    val duplicateEntry = resolveSleetStormAreaHazardSave(entryFailed, Goblin, entryTriggerFact, false)
    val goblinTurn = endTurn(entryFailed)
    all {
      assert(entryFailed.goblin.prone),
      assert(not(entryFailed.goblin.concentrating)),
      assert(not(entryFailed.goblin.activeEffects.contains(sleetStormAreaHazard(99)))),
      assert(sleetStormSaveAlreadyResolved(entryFailed, Goblin, sleetStormAreaId)),
      assert(duplicateEntry.goblin.activeEffects == entryFailed.goblin.activeEffects),
      assert(duplicateEntry.goblin.concentrating == entryFailed.goblin.concentrating),
      assert(not(sleetStormSaveAlreadyResolved(goblinTurn, Goblin, sleetStormAreaId))),
    }
  }

  run test_sleet_storm_entry_save_blocks_start_turn_save_in_same_turn = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    val entryTriggerFact = SleetStormFirstEntryOnTurn({ areaId: sleetStormAreaId })
    val startTurnTriggerFact = SleetStormTurnStartInArea({ areaId: sleetStormAreaId })
    val entrySucceeded = resolveSleetStormAreaHazardSave(resolved, Goblin, entryTriggerFact, true)
    val duplicateStartTurn = resolveSleetStormAreaHazardSave(entrySucceeded, Goblin, startTurnTriggerFact, false)
    all {
      assert(sleetStormSaveAlreadyResolved(entrySucceeded, Goblin, sleetStormAreaId)),
      assert(duplicateStartTurn.goblin == entrySucceeded.goblin),
      assert(duplicateStartTurn.fighter.activeEffects == entrySucceeded.fighter.activeEffects),
    }
  }

  run test_sleet_storm_start_turn_success_marks_ledger_without_prone_or_concentration_loss = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    val goblinTurn = endTurn(resolved)
    val concentratingGoblin = {
      ...goblinTurn,
      goblin: {
        ...goblinTurn.goblin,
        concentrating: true,
      },
    }
    val startTurnTriggerFact = SleetStormTurnStartInArea({ areaId: sleetStormAreaId })
    val startTurnSucceeded = resolveSleetStormAreaHazardSave(concentratingGoblin, Goblin, startTurnTriggerFact, true)
    val duplicateStartTurn = resolveSleetStormAreaHazardSave(startTurnSucceeded, Goblin, startTurnTriggerFact, false)
    all {
      assert(not(startTurnSucceeded.goblin.prone)),
      assert(startTurnSucceeded.goblin.concentrating),
      assert(sleetStormSaveAlreadyResolved(startTurnSucceeded, Goblin, sleetStormAreaId)),
      assert(duplicateStartTurn.goblin == startTurnSucceeded.goblin),
      assert(duplicateStartTurn.fighter.activeEffects == startTurnSucceeded.fighter.activeEffects),
    }
  }

  run test_sleet_storm_start_turn_save_blocks_entry_save_in_same_turn = {
    val resolved = resolveSleetStorm(initialState, sleetStormAreaId, 3)
    val goblinTurn = endTurn(resolved)
    val startTurnTriggerFact = SleetStormTurnStartInArea({ areaId: sleetStormAreaId })
    val entryTriggerFact = SleetStormFirstEntryOnTurn({ areaId: sleetStormAreaId })
    val startTurnSucceeded = resolveSleetStormAreaHazardSave(goblinTurn, Goblin, startTurnTriggerFact, true)
    val duplicateEntry = resolveSleetStormAreaHazardSave(startTurnSucceeded, Goblin, entryTriggerFact, false)
    all {
      assert(sleetStormSaveAlreadyResolved(startTurnSucceeded, Goblin, sleetStormAreaId)),
      assert(duplicateEntry.goblin == startTurnSucceeded.goblin),
      assert(duplicateEntry.fighter.activeEffects == startTurnSucceeded.fighter.activeEffects),
    }
  }

  run test_sleet_storm_duration_expiration_clears_hazard_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(SleetStormAreaHazard({
          areaId: sleetStormAreaId,
          radiusFeet: sleetStormRadiusFeet,
          heightFeet: sleetStormHeightFeet,
          durationTicks: 1,
          savedThisTurn: Set(Goblin),
        })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(sleetStormAreaHazardActive(ticked, sleetStormAreaId))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

}
