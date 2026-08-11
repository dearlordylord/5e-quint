// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamShapeShiftRider {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"

  type MoonbeamShapeShiftRiderResult = {
    state: BattleState,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  }

  pure def resolveMoonbeamShapeShiftRider(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  ): MoonbeamShapeShiftRiderResult =
    if (savingThrowSucceeded)
      { state: state, targetShapeShiftState: targetShapeShiftState }
    else
      match revertShapeShiftedRuntimeState(targetShapeShiftState) {
        | ShapeShiftAlreadyTrueForm =>
            { state: state, targetShapeShiftState: TrueForm }
        | ShapeShiftRevertedToTrueForm =>
            {
              state: markMoonbeamShapeShiftSuppressed(state, targetActor, areaId),
              targetShapeShiftState: TrueForm,
            }
      }

}
