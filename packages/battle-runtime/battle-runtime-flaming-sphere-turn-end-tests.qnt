// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereTurnEndTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"
  import battleRuntimeFlamingSphereTurnEnd.* from "./battle-runtime-flaming-sphere-turn-end"

  run test_flaming_sphere_end_within_five_feet_save_damages_before_turn_advance = {
    val resolved = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(FlamingSphere({ areaId: flamingSphereAreaId, damageDice: flamingSphereDamageDice(2), durationTicks: flamingSphereDurationTicks, ramMaxMoveFeet: flamingSphereRamMaxMoveFeet })) } }
    val goblinTurn = endTurn(resolved)
    val endWithinFiveFeetFailed = endTurnWithFlamingSphereEndWithinFiveFeetSave(goblinTurn, Goblin, flamingSphereAreaId, false, 7)
    all {
      assert(endWithinFiveFeetFailed.goblin.hp == 3),
      assert(currentActor(endWithinFiveFeetFailed) == Fighter),
    }
  }
}
