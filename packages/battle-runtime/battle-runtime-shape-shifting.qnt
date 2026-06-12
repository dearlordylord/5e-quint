// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
module battleRuntimeShapeShifting {
  // SRD 5.2.1 Rules Glossary "Shape-Shifting": an effect such as Wild Shape
  // or Polymorph specifies the replacement form, ongoing effects carry over
  // unless said otherwise, and the creature reverts to true form if it dies.
  type ClassFeatureShapeShiftSource = { sourceCombatantId: str, sourceUnitId: str }
  type SpellEffectShapeShiftSource = { sourceCombatantId: str, sourceSpellId: str }

  type ShapeShiftedReplacementFormFacts = {
    armorClass: int,
    creatureSize: str,
    speedFeet: int,
    strengthModifier: int,
    dexterityModifier: int,
    constitutionModifier: int,
    stealthModifier: int,
    perceptionModifier: int,
    dexteritySavingThrowModifier: int,
    wisdomSavingThrowModifier: int,
  }

  type ShapeShiftedRuntimeState =
    TrueForm
  | ClassFeatureShapeShifted({
      source: ClassFeatureShapeShiftSource,
      replacementForm: ShapeShiftedReplacementFormFacts,
    })
  | SpellEffectShapeShifted({
      source: SpellEffectShapeShiftSource,
      replacementForm: ShapeShiftedReplacementFormFacts,
    })

  type DruidWildShapeRuntimeState =
    DruidWildShapeTrueForm
  | DruidWildShapeShifted({
      source: ClassFeatureShapeShiftSource,
      replacementForm: ShapeShiftedReplacementFormFacts,
    })

  type ShapeShiftReversionResult =
    ShapeShiftAlreadyTrueForm
  | ShapeShiftRevertedToTrueForm

  pure def isShapeShifted(shapeShiftState: ShapeShiftedRuntimeState): bool =
    match shapeShiftState {
      | TrueForm => false
      | ClassFeatureShapeShifted(_) => true
      | SpellEffectShapeShifted(_) => true
    }

  pure def revertShapeShiftedRuntimeState(shapeShiftState: ShapeShiftedRuntimeState): ShapeShiftReversionResult =
    match shapeShiftState {
      | TrueForm => ShapeShiftAlreadyTrueForm
      | ClassFeatureShapeShifted(_) => ShapeShiftRevertedToTrueForm
      | SpellEffectShapeShifted(_) => ShapeShiftRevertedToTrueForm
    }

  pure def shapeShiftStateAfterReversion(shapeShiftState: ShapeShiftedRuntimeState): ShapeShiftedRuntimeState =
    match revertShapeShiftedRuntimeState(shapeShiftState) {
      | ShapeShiftAlreadyTrueForm => TrueForm
      | ShapeShiftRevertedToTrueForm => TrueForm
    }

  pure def druidWildShapeStateAfterReversion(shapeShiftState: DruidWildShapeRuntimeState): DruidWildShapeRuntimeState =
    match shapeShiftState {
      | DruidWildShapeTrueForm => DruidWildShapeTrueForm
      | DruidWildShapeShifted(_) => DruidWildShapeTrueForm
    }

  pure def druidWildShapeIsShapeShifted(shapeShiftState: DruidWildShapeRuntimeState): bool =
    match shapeShiftState {
      | DruidWildShapeTrueForm => false
      | DruidWildShapeShifted(_) => true
    }

  pure def syntheticLargeFastFormFacts: ShapeShiftedReplacementFormFacts = {
    armorClass: 11,
    creatureSize: "large",
    speedFeet: 60,
    strengthModifier: 3,
    dexterityModifier: 1,
    constitutionModifier: 1,
    stealthModifier: 1,
    perceptionModifier: 0,
    dexteritySavingThrowModifier: 1,
    wisdomSavingThrowModifier: 0,
  }

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
