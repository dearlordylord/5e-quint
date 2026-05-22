// -*- mode: Bluespec; -*-

module battleRuntimeShapeShifting {
  // SRD 5.2.1 Rules Glossary "Shape-Shifting": an effect such as Wild Shape
  // or Polymorph specifies the replacement form, ongoing effects carry over
  // unless said otherwise, and the creature reverts to true form if it dies.
  type ClassFeatureShapeShiftSource = { sourceCombatantId: str, sourceUnitId: str }
  type SpellEffectShapeShiftSource = { sourceCombatantId: str, sourceSpellId: str }
  type StatBlockShapechangerSource = { sourceCombatantId: str }

  type ShapeShiftSource =
    ClassFeatureShapeShift(ClassFeatureShapeShiftSource)
  | SpellEffectShapeShift(SpellEffectShapeShiftSource)
  | StatBlockShapechanger(StatBlockShapechangerSource)

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
  | StatBlockShapechangerShapeShifted({
      source: StatBlockShapechangerSource,
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
  | ShapeShiftReverted({ state: ShapeShiftedRuntimeState })
  | UnsupportedShapeShiftSource({ source: ShapeShiftSource })

  pure def isShapeShifted(shapeShiftState: ShapeShiftedRuntimeState): bool =
    match shapeShiftState {
      | TrueForm => false
      | ClassFeatureShapeShifted(_) => true
      | SpellEffectShapeShifted(_) => true
      | StatBlockShapechangerShapeShifted(_) => true
    }

  pure def revertShapeShiftedRuntimeState(shapeShiftState: ShapeShiftedRuntimeState): ShapeShiftReversionResult =
    match shapeShiftState {
      | TrueForm => ShapeShiftAlreadyTrueForm
      | ClassFeatureShapeShifted(_) => ShapeShiftReverted({ state: TrueForm })
      | SpellEffectShapeShifted(data) => UnsupportedShapeShiftSource({ source: SpellEffectShapeShift(data.source) })
      | StatBlockShapechangerShapeShifted(data) => UnsupportedShapeShiftSource({ source: StatBlockShapechanger(data.source) })
    }

  pure def shapeShiftStateAfterSupportedReversion(shapeShiftState: ShapeShiftedRuntimeState): ShapeShiftedRuntimeState =
    match revertShapeShiftedRuntimeState(shapeShiftState) {
      | ShapeShiftAlreadyTrueForm => TrueForm
      | ShapeShiftReverted(data) => data.state
      | UnsupportedShapeShiftSource(_) => shapeShiftState
    }

  pure def druidWildShapeStateAfterSupportedReversion(shapeShiftState: DruidWildShapeRuntimeState): DruidWildShapeRuntimeState =
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

  run test_spell_shape_shift_source_reversion_is_explicit_followup = {
    val source = {
      sourceCombatantId: "synthetic_shape_caster",
      sourceSpellId: "synthetic_shape_spell",
    }
    val replacement = SpellEffectShapeShifted({
      source: source,
      replacementForm: syntheticLargeFastFormFacts,
    })
    val result = revertShapeShiftedRuntimeState(replacement)
    all {
      assert(isShapeShifted(replacement)),
      assert(result == UnsupportedShapeShiftSource({ source: SpellEffectShapeShift(source) })),
      assert(shapeShiftStateAfterSupportedReversion(replacement) == replacement),
    }
  }

  run test_stat_block_shapechanger_source_is_distinct_from_spell_source = {
    val source = {
      sourceCombatantId: "synthetic_shapechanger",
    }
    val replacement = StatBlockShapechangerShapeShifted({
      source: source,
      replacementForm: { ...syntheticLargeFastFormFacts, creatureSize: "small" },
    })
    all {
      assert(isShapeShifted(replacement)),
      assert(replacement != TrueForm),
      assert(revertShapeShiftedRuntimeState(replacement) == UnsupportedShapeShiftSource({ source: StatBlockShapechanger(source) })),
    }
  }
}
