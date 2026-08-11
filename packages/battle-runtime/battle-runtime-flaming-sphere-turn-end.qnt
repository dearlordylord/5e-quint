// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
module battleRuntimeFlamingSphereTurnEnd {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"

  pure def endTurnWithFlamingSphereEndWithinFiveFeetSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    endTurn(resolveFlamingSphereEndWithinFiveFeetSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage))

}
