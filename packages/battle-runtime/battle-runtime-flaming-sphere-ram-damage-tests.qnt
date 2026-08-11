// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereRamDamageTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"
  import battleRuntimeFlamingSphereRamDamage.* from "./battle-runtime-flaming-sphere-ram-damage"

  run test_flaming_sphere_ram_spends_bonus_action_and_halves_success_damage = {
    val resolved = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(FlamingSphere({ areaId: flamingSphereAreaId, damageDice: flamingSphereDamageDice(2), durationTicks: flamingSphereDurationTicks, ramMaxMoveFeet: flamingSphereRamMaxMoveFeet })) } }
    val rammed = resolveFlamingSphereRam(resolved, Goblin, flamingSphereAreaId, true, 6, 30)
    val tooFar = resolveFlamingSphereRam(resolved, Goblin, flamingSphereAreaId, true, 6, 31)
    all {
      assert(rammed.goblin.hp == 7),
      assert(not(rammed.bonusActionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.bonusActionAvailable),
    }
  }
}
