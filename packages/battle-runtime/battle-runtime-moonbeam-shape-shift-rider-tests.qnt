// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamShapeShiftRiderTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamFacts.* from "./battle-runtime-moonbeam-facts"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import battleRuntimeMoonbeamShapeShiftRider.* from "./battle-runtime-moonbeam-shape-shift-rider"
  import battleRuntimeMoonbeamSaveWithShapeShift.* from "./battle-runtime-moonbeam-save-with-shape-shift"

  run test_moonbeam_failed_save_reverts_shape_shift_and_suppresses_until_exit = {
    val resolved = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(MoonbeamMovableZone({ areaId: moonbeamAreaId, damageDice: moonbeamDamageDice(2), durationTicks: moonbeamDurationTicks, repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet, savedThisTurn: Set(), shapeShiftSuppressed: Set() })) } }
    val shifted = ClassFeatureShapeShifted({
      source: {
        sourceCombatantId: "synthetic_druid",
        sourceUnitId: "synthetic_shape_feature",
      },
      replacementForm: syntheticLargeFastFormFacts,
    })
    val failed = resolveMoonbeamSaveWithShapeShift(resolved, Goblin, moonbeamAreaId, false, 8, shifted)
    val succeeded = resolveMoonbeamSaveWithShapeShift(resolved, Goblin, moonbeamAreaId, true, 8, shifted)
    val exited = clearMoonbeamShapeShiftSuppressed(failed.state, Goblin, moonbeamAreaId)
    val broken = breakConcentrationSpellEffects(failed.state, Fighter)
    all {
      assert(failed.targetShapeShiftState == TrueForm),
      assert(failed.state.goblin.hp == 2),
      assert(succeeded.targetShapeShiftState == shifted),
      assert(succeeded.state.goblin.hp == 6),
      assert(moonbeamShapeShiftSuppressed(failed.state, Goblin, moonbeamAreaId)),
      assert(not(moonbeamShapeShiftSuppressed(succeeded.state, Goblin, moonbeamAreaId))),
      assert(not(moonbeamShapeShiftSuppressed(exited, Goblin, moonbeamAreaId))),
      assert(not(moonbeamShapeShiftSuppressed(broken, Goblin, moonbeamAreaId))),
    }
  }
}
