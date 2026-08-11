// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamTurnEndTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamSaveDamage.* from "./battle-runtime-moonbeam-save-damage"
  import battleRuntimeMoonbeamTurnEnd.* from "./battle-runtime-moonbeam-turn-end"

  run test_moonbeam_save_limited_once_per_turn_and_resets_on_turn_advance = {
    val resolved = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(MoonbeamMovableZone({ areaId: moonbeamAreaId, damageDice: moonbeamDamageDice(2), durationTicks: moonbeamDurationTicks, repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet, savedThisTurn: Set(), shapeShiftSuppressed: Set() })) } }
    val firstSave = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, false, 4)
    val duplicateSave = resolveMoonbeamSave(firstSave, Goblin, moonbeamAreaId, false, 4)
    val nextTurn = endTurnWithMoonbeamSave(firstSave, Goblin, moonbeamAreaId, false, 4)
    all {
      assert(firstSave.goblin.hp == 6),
      assert(duplicateSave.goblin.hp == 6),
      assert(not(moonbeamSavedThisTurn(nextTurn, Goblin, moonbeamAreaId))),
      assert(currentActor(nextTurn) == Goblin),
    }
  }
}
