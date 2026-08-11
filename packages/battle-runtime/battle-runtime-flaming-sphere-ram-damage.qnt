// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
module battleRuntimeFlamingSphereRamDamage {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"

  pure def resolveFlamingSphereRam(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
    moveFeet: int,
  ): BattleState =
    if (
      not(flamingSphereActive(state, areaId)) or
      currentActor(state) != Fighter or
      not(state.bonusActionAvailable) or
      moveFeet <= 0 or
      moveFeet > flamingSphereActiveRamMaxMoveFeet(state, areaId)
    )
      state
    else {
      val damaged = resolveFlamingSphereEndWithinFiveFeetSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage)
      { ...damaged, bonusActionAvailable: false }
    }

}
