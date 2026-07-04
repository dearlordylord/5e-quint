module battleRuntimeShapeShiftingTests {
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"

  run test_every_admitted_shape_shift_state_is_reversible = {
    val classFeatureReplacement = ClassFeatureShapeShifted({
      source: {
        sourceCombatantId: "synthetic_shape_druid",
        sourceUnitId: "synthetic_wild_shape_feature",
      },
      replacementForm: syntheticLargeFastFormFacts,
    })
    val spellEffectReplacement = SpellEffectShapeShifted({
      source: {
        sourceCombatantId: "synthetic_shape_caster",
        sourceSpellId: "synthetic_shape_spell",
      },
      replacementForm: syntheticLargeFastFormFacts,
    })
    all {
      assert(not(isShapeShifted(TrueForm))),
      assert(isShapeShifted(classFeatureReplacement)),
      assert(isShapeShifted(spellEffectReplacement)),
      assert(revertShapeShiftedRuntimeState(TrueForm) == ShapeShiftAlreadyTrueForm),
      assert(revertShapeShiftedRuntimeState(classFeatureReplacement) == ShapeShiftRevertedToTrueForm),
      assert(revertShapeShiftedRuntimeState(spellEffectReplacement) == ShapeShiftRevertedToTrueForm),
      assert(shapeShiftStateAfterReversion(TrueForm) == TrueForm),
      assert(shapeShiftStateAfterReversion(classFeatureReplacement) == TrueForm),
      assert(shapeShiftStateAfterReversion(spellEffectReplacement) == TrueForm),
    }
  }

}
