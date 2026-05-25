// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
//
// Focused semantic core for SRD Druid Wild Shape battle form lifecycle state.
// RAW anchors:
// - .references/srd-5.2.1/Classes/Druid.md lines 95-121: Bonus Action known
//   Beast form assumption, use spending, replacement by reuse, early Bonus
//   Action dismissal, Incapacitated/death reversion, Temporary Hit Points,
//   Beast stat-block projection, retained mental statistics/proficiencies, and
//   no spellcasting while shape-shifted.
// - .references/srd-5.2.1/Rules-Glossary.md lines 871-874: shape-shifting
//   effects specify their own form rules and revert to true form on death.
// - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Stat Block, Action
//   Lifecycle, and Creatures and Stat Blocks.

module battleRuntimeDruidWildShape {
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"

  type DruidWildShapeFormFacts = ShapeShiftedReplacementFormFacts
  type DruidWildShapeFormState = DruidWildShapeRuntimeState
  type DruidWildShapeProjection = {
    bonusActionAvailable: bool,
    usesRemaining: int,
    activeForm: DruidWildShapeFormState,
    tempHp: int,
  }

  pure def initialProjection: DruidWildShapeProjection = {
    bonusActionAvailable: true,
    usesRemaining: 2,
    activeForm: DruidWildShapeTrueForm,
    tempHp: 0,
  }

  pure def proficiencyBonus: int = 2
  pure def characterStrengthModifier: int = -1
  pure def characterDexterityModifier: int = 0
  pure def characterConstitutionModifier: int = 0
  pure def characterIntelligenceModifier: int = 3
  pure def characterWisdomModifier: int = 2
  pure def characterCharismaModifier: int = 1
  pure def characterNatureModifier: int =
    characterIntelligenceModifier + proficiencyBonus
  pure def characterStealthModifier: int =
    characterDexterityModifier + proficiencyBonus + proficiencyBonus
  pure def characterDexteritySavingThrowModifier: int =
    characterDexterityModifier + proficiencyBonus
  pure def characterWisdomSavingThrowModifier: int =
    characterWisdomModifier + proficiencyBonus

  pure def druidWildShapeSource: ClassFeatureShapeShiftSource =
    {
      sourceCombatantId: "synthetic_druid",
      sourceUnitId: "synthetic_druid_wild_shape",
    }

  pure def largeFastFormFacts: DruidWildShapeFormFacts = {
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

  pure def mediumSwiftFormFacts: DruidWildShapeFormFacts = {
    armorClass: 12,
    creatureSize: "medium",
    speedFeet: 40,
    strengthModifier: 2,
    dexterityModifier: 2,
    constitutionModifier: 1,
    stealthModifier: 4,
    perceptionModifier: 5,
    dexteritySavingThrowModifier: 6,
    wisdomSavingThrowModifier: 1,
  }

  pure def projectedArmorClass(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => 16
      | DruidWildShapeShifted(data) => data.replacementForm.armorClass
    }

  pure def projectedSize(state: DruidWildShapeProjection): str =
    match state.activeForm {
      | DruidWildShapeTrueForm => "medium"
      | DruidWildShapeShifted(data) => data.replacementForm.creatureSize
    }

  pure def projectedSpeedFeet(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => 30
      | DruidWildShapeShifted(data) => data.replacementForm.speedFeet
    }

  pure def canCastSpells(state: DruidWildShapeProjection): bool =
    match state.activeForm {
      | DruidWildShapeTrueForm => true
      | DruidWildShapeShifted(_) => false
    }

  pure def projectedShoveSaveDc(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => 13
      | DruidWildShapeShifted(data) => 8 + data.replacementForm.strengthModifier + proficiencyBonus
    }

  pure def projectedStrengthModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterStrengthModifier
      | DruidWildShapeShifted(data) => data.replacementForm.strengthModifier
    }

  pure def projectedDexterityModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterDexterityModifier
      | DruidWildShapeShifted(data) => data.replacementForm.dexterityModifier
    }

  pure def projectedConstitutionModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterConstitutionModifier
      | DruidWildShapeShifted(data) => data.replacementForm.constitutionModifier
    }

  pure def projectedIntelligenceModifier(_state: DruidWildShapeProjection): int =
    characterIntelligenceModifier

  pure def projectedWisdomModifier(_state: DruidWildShapeProjection): int =
    characterWisdomModifier

  pure def projectedCharismaModifier(_state: DruidWildShapeProjection): int =
    characterCharismaModifier

  pure def projectedNatureModifier(_state: DruidWildShapeProjection): int =
    characterNatureModifier

  pure def projectedStealthModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterStealthModifier
      | DruidWildShapeShifted(data) =>
        if (data.replacementForm.stealthModifier > characterStealthModifier)
          data.replacementForm.stealthModifier
        else characterStealthModifier
    }

  pure def projectedPerceptionModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterWisdomModifier
      | DruidWildShapeShifted(data) =>
        if (data.replacementForm.perceptionModifier > characterWisdomModifier)
          data.replacementForm.perceptionModifier
        else characterWisdomModifier
    }

  pure def projectedDexteritySavingThrowModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterDexteritySavingThrowModifier
      | DruidWildShapeShifted(data) =>
        if (data.replacementForm.dexteritySavingThrowModifier > characterDexteritySavingThrowModifier)
          data.replacementForm.dexteritySavingThrowModifier
        else characterDexteritySavingThrowModifier
    }

  pure def projectedWisdomSavingThrowModifier(state: DruidWildShapeProjection): int =
    match state.activeForm {
      | DruidWildShapeTrueForm => characterWisdomSavingThrowModifier
      | DruidWildShapeShifted(data) =>
        if (data.replacementForm.wisdomSavingThrowModifier > characterWisdomSavingThrowModifier)
          data.replacementForm.wisdomSavingThrowModifier
        else characterWisdomSavingThrowModifier
    }

  pure def canAssumeForm(state: DruidWildShapeProjection): bool =
    state.bonusActionAvailable and state.usesRemaining > 0

  pure def canDismissForm(state: DruidWildShapeProjection): bool =
    state.bonusActionAvailable and match state.activeForm {
      | DruidWildShapeTrueForm => false
      | DruidWildShapeShifted(_) => true
    }

  pure def assumeForm(
    state: DruidWildShapeProjection,
    form: DruidWildShapeFormFacts,
  ): DruidWildShapeProjection =
    if (canAssumeForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining - 1,
      activeForm: DruidWildShapeShifted({
        source: druidWildShapeSource,
        replacementForm: form,
      }),
      tempHp: if (state.tempHp > 2) state.tempHp else 2,
    } else state

  pure def dismissForm(state: DruidWildShapeProjection): DruidWildShapeProjection =
    if (canDismissForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining,
      activeForm: druidWildShapeStateAfterSupportedReversion(state.activeForm),
      tempHp: state.tempHp,
    } else state

  pure def revertForm(state: DruidWildShapeProjection): DruidWildShapeProjection = {
    bonusActionAvailable: state.bonusActionAvailable,
    usesRemaining: state.usesRemaining,
    activeForm: druidWildShapeStateAfterSupportedReversion(state.activeForm),
    tempHp: state.tempHp,
  }

}
