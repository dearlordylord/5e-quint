// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"
  import battleRuntimeFlamingSphereCast.* from "./battle-runtime-flaming-sphere-cast"
  import battleRuntimeFlamingSphereReposition.* from "./battle-runtime-flaming-sphere-reposition"

  run test_flaming_sphere_records_movable_fire_hazard = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(FlamingSphere({
        areaId: flamingSphereAreaId,
        damageDice: 2,
        durationTicks: flamingSphereDurationTicks,
        ramMaxMoveFeet: flamingSphereRamMaxMoveFeet,
      }))),
      assert(flamingSphereDiameterFeet == 5),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }
  run test_flaming_sphere_slot_scaling_increases_damage_dice = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 3)
    all {
      assert(flamingSphereDamageDice(2) == 2),
      assert(flamingSphereDamageDice(3) == 3),
      assert(flamingSphereActiveDamageDice(resolved, flamingSphereAreaId) == 3),
    }
  }
  run test_flaming_sphere_reposition_spends_bonus_action_without_damage = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    val moved = resolveFlamingSphereReposition(resolved, flamingSphereAreaId, 30)
    val tooFar = resolveFlamingSphereReposition(resolved, flamingSphereAreaId, 31)
    all {
      assert(moved.goblin.hp == initialState.goblin.hp),
      assert(not(moved.bonusActionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.bonusActionAvailable),
    }
  }
}
