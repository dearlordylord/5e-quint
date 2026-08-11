// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-web-restraint-hazard

module battleRuntimeWebRestraintRecurringSaveTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWebRestraintAreaHazard.* from "./battle-runtime-web-restraint-area-hazard"

  run test_web_start_turn_save_restrains_and_escape_removes_condition = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val goblinTurn = endTurn(resolved)
    val startTurnFailed = resolveWebRestraintSave(goblinTurn, Goblin, webAreaId, false, false)
    val duplicateStartTurn = resolveWebRestraintSave(startTurnFailed, Goblin, webAreaId, false, false)
    val escaped = escapeWebRestrained(startTurnFailed, Goblin, true)
    all {
      assert(startTurnFailed.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks }))),
      assert(webStartTurnSaveAlreadyResolved(startTurnFailed, Goblin, webAreaId)),
      assert(duplicateStartTurn.fighter.activeEffects == startTurnFailed.fighter.activeEffects),
      assert(not(escaped.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(not(escaped.actionAvailable)),
      assert(webRestraintHazardActive(escaped, webAreaId)),
    }
  }

  run test_web_no_longer_in_area_and_area_removal_cleanup = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val restrained = resolveWebRestraintSave(resolved, Goblin, webAreaId, true, false)
    val leftArea = webRestrainedNoLongerInArea(restrained, Goblin, webAreaId)
    val restrainedAgain = resolveWebRestraintSave(resolved, Goblin, webAreaId, false, false)
    val removedArea = removeWebArea(restrainedAgain, webAreaId)
    all {
      assert(not(leftArea.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(webRestraintHazardActive(leftArea, webAreaId)),
      assert(not(webRestraintHazardActive(removedArea, webAreaId))),
      assert(not(removedArea.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(not(removedArea.fighter.concentrating)),
    }
  }

  run test_web_duration_expiration_clears_hazard_restraint_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(WebRestraintHazard({
          areaId: webAreaId,
          sideFeet: webSideFeet,
          durationTicks: 1,
          entrySavedThisTurn: Set(Goblin),
          startTurnSavedThisTurn: Set(Goblin),
        })),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(WebRestrained({ source: Fighter, durationTicks: 1 })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(webRestraintHazardActive(ticked, webAreaId))),
      assert(not(ticked.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: 1 })))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

}
