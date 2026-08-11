// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereReposition {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"

  pure def resolveFlamingSphereReposition(
    state: BattleState,
    areaId: int,
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
    else
      { ...state, bonusActionAvailable: false }

}
