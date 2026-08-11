// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-web-restraint-hazard

module battleRuntimeWebRestraintLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWebRestraintAreaHazard.* from "./battle-runtime-web-restraint-area-hazard"

  run test_web_records_restraint_hazard_and_concentration = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(WebRestraintHazard({
        areaId: webAreaId,
        sideFeet: webSideFeet,
        durationTicks: webDurationTicks,
        entrySavedThisTurn: Set(),
        startTurnSavedThisTurn: Set(),
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_web_area_difficult_terrain_movement_cost_uses_active_web_area = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val removedArea = removeWebArea(resolved, webAreaId)
    all {
      assert(webDifficultTerrainMovementCost(resolved, webAreaId, 10, 5) == 15),
      assert(webDifficultTerrainMovementCost(removedArea, webAreaId, 10, 5) == 0),
    }
  }

  run test_web_area_sight_obscurement_uses_active_web_area = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val removedArea = removeWebArea(resolved, webAreaId)
    all {
      assert(webRestraintHazardSightObscurement(resolved, webAreaId) == LightlyObscuredSight),
      assert(webRestraintHazardSightObscurement(removedArea, webAreaId) == UnobscuredSight),
    }
  }

  run test_web_entry_save_restrains_once_per_turn_and_resets_next_turn = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val entryFailed = resolveWebRestraintSave(resolved, Goblin, webAreaId, true, false)
    val duplicateEntry = resolveWebRestraintSave(entryFailed, Goblin, webAreaId, true, false)
    val goblinTurn = endTurn(entryFailed)
    all {
      assert(entryFailed.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks }))),
      assert(webEntrySaveAlreadyResolved(entryFailed, Goblin, webAreaId)),
      assert(duplicateEntry.goblin.activeEffects == entryFailed.goblin.activeEffects),
      assert(not(webEntrySaveAlreadyResolved(goblinTurn, Goblin, webAreaId))),
      assert(not(webStartTurnSaveAlreadyResolved(goblinTurn, Goblin, webAreaId))),
    }
  }

}

