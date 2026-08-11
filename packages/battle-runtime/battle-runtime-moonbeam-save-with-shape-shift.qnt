// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamSaveWithShapeShift {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamSaveDamage.* from "./battle-runtime-moonbeam-save-damage"
  import battleRuntimeMoonbeamShapeShiftRider.* from "./battle-runtime-moonbeam-shape-shift-rider"

  pure def resolveMoonbeamSaveWithShapeShift(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  ): MoonbeamShapeShiftRiderResult = {
    val wasSaved = moonbeamSavedThisTurn(state, targetActor, areaId)
    val damaged = resolveMoonbeamSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage)
    if (wasSaved or damaged == state)
      { state: state, targetShapeShiftState: targetShapeShiftState }
    else
      resolveMoonbeamShapeShiftRider(damaged, targetActor, areaId, savingThrowSucceeded, targetShapeShiftState)
  }
}

