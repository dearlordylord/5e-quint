// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamSaveDamageTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamFacts.* from "./battle-runtime-moonbeam-facts"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeMoonbeamSaveDamage.* from "./battle-runtime-moonbeam-save-damage"

  run test_moonbeam_slot_scaling_and_save_damage = {
    val resolved = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(MoonbeamMovableZone({ areaId: moonbeamAreaId, damageDice: moonbeamDamageDice(4), durationTicks: moonbeamDurationTicks, repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet, savedThisTurn: Set(), shapeShiftSuppressed: Set() })) } }
    val failed = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, false, 8)
    val succeeded = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, true, 8)
    all {
      assert(moonbeamDamageDice(2) == 2),
      assert(moonbeamDamageDice(4) == 4),
      assert(moonbeamActiveDamageDice(resolved, moonbeamAreaId) == 4),
      assert(failed.goblin.hp == 2),
      assert(succeeded.goblin.hp == 6),
    }
  }
}
