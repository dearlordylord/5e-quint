// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-grease-ground-hazard

module battleRuntimeGreaseGroundHazardTests {
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGreaseGroundHazard.* from "./battle-runtime-grease-ground-hazard"

  run test_grease_records_ground_hazard_and_prones_failed_appearance_save = {
    val resolved = resolveGrease(initialState, true, false)
    all {
      assert(resolved.fighter.activeEffects.contains(greaseGroundHazard(greaseAreaId, noHeightenedSpellTarget))),
      assert(resolved.goblin.prone),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_grease_empty_area_records_hazard_without_target_membership_state = {
    val resolved = resolveGrease(initialState, false, true)
    all {
      assert(resolved.fighter.activeEffects.contains(greaseGroundHazard(greaseAreaId, noHeightenedSpellTarget))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_grease_ground_hazard_entry_save_applies_prone = {
    val resolved = resolveGrease(initialState, false, true)
    val entryFailed = resolveGreaseGroundHazardSave(resolved, Goblin, greaseAreaId, false)
    all {
      assert(entryFailed.goblin.prone),
      assert(currentActor(entryFailed) == Fighter),
    }
  }

  run test_heightened_grease_ground_hazard_entry_save_roll_mode_is_selected_target_only = {
    val resolved = resolveGreaseWithHeightenedTarget(initialState, false, true, HeightenedSpellTarget({ target: Goblin }))
    all {
      assert(greaseGroundHazardSaveRollMode(resolved, Goblin, greaseAreaId) == DisadvantageSavingThrow),
      assert(greaseGroundHazardSaveRollMode(resolved, Fighter, greaseAreaId) == NormalSavingThrow),
    }
  }

  run test_grease_difficult_terrain_movement_cost_adds_extra_grease_distance = {
    val resolved = resolveGrease(initialState, false, true)
    val moved = moveFighterThroughGreaseGroundDifficultTerrain(resolved, greaseAreaId, 10, 5, false)
    val expired = { ...resolved, fighter: { ...resolved.fighter, activeEffects: Set() } }
    all {
      assert(greaseGroundDifficultTerrainMovementCost(resolved, greaseAreaId, 10, 5) == 15),
      assert(moved.fighter.movementSpent == 15),
      assert(greaseGroundDifficultTerrainMovementCost(expired, greaseAreaId, 10, 5) == 0),
    }
  }

  run test_grease_ground_hazard_end_turn_save_advances_turn = {
    val resolved = resolveGrease(initialState, false, true)
    val goblinTurn = endTurn(resolved)
    val endTurnFailed = endTurnWithGreaseGroundHazardSave(goblinTurn, Goblin, greaseAreaId, false)
    all {
      assert(endTurnFailed.goblin.prone),
      assert(currentActor(endTurnFailed) == Fighter),
    }
  }

  run test_heightened_grease_ground_hazard_end_turn_save_roll_mode_is_selected_target_only = {
    val resolved = resolveGreaseWithHeightenedTarget(initialState, false, true, HeightenedSpellTarget({ target: Goblin }))
    val goblinTurn = endTurn(resolved)
    all {
      assert(greaseGroundHazardSaveRollMode(goblinTurn, Goblin, greaseAreaId) == DisadvantageSavingThrow),
      assert(greaseGroundHazardSaveRollMode(goblinTurn, Fighter, greaseAreaId) == NormalSavingThrow),
    }
  }


}
