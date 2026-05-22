// -*- mode: Bluespec; -*-

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

  run test_druid_wild_shape_assume_form_projects_beast_combat_facts = {
    val state = assumeForm(initialProjection, largeFastFormFacts)
    all {
      assert(state.bonusActionAvailable == false),
      assert(state.usesRemaining == 1),
      assert(state.tempHp == 2),
      assert(druidWildShapeIsShapeShifted(state.activeForm)),
      assert(projectedArmorClass(state) == 11),
      assert(projectedSize(state) == "large"),
      assert(projectedSpeedFeet(state) == 60),
      assert(projectedShoveSaveDc(state) == 13),
      assert(canCastSpells(state) == false),
    }
  }

  run test_druid_wild_shape_projects_d20_statistics = {
    val state = assumeForm(initialProjection, mediumSwiftFormFacts)
    all {
      assert(projectedStrengthModifier(state) == 2),
      assert(projectedDexterityModifier(state) == 2),
      assert(projectedConstitutionModifier(state) == 1),
      assert(projectedIntelligenceModifier(state) == 3),
      assert(projectedWisdomModifier(state) == 2),
      assert(projectedCharismaModifier(state) == 1),
      assert(projectedNatureModifier(state) == 5),
      assert(projectedStealthModifier(state) == 4),
      assert(projectedPerceptionModifier(state) == 5),
      assert(projectedDexteritySavingThrowModifier(state) == 6),
      assert(projectedWisdomSavingThrowModifier(state) == 4),
    }
  }

  run test_druid_wild_shape_reuse_replaces_active_form_and_spends_use = {
    val first = assumeForm(initialProjection, largeFastFormFacts)
    val second = assumeForm({ ...first, bonusActionAvailable: true }, mediumSwiftFormFacts)
    all {
      assert(second.usesRemaining == 0),
      assert(projectedArmorClass(second) == 12),
      assert(projectedSpeedFeet(second) == 40),
      assert(projectedShoveSaveDc(second) == 12),
    }
  }

  run test_druid_wild_shape_rejects_unavailable_assume_form = {
    val unavailable = { ...initialProjection, bonusActionAvailable: false, usesRemaining: 0 }
    val result = assumeForm(unavailable, largeFastFormFacts)
    all {
      assert(result.usesRemaining == 0),
      assert(result.activeForm == DruidWildShapeTrueForm),
    }
  }

  run test_druid_wild_shape_dismiss_and_revert_restore_true_form_projection = {
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val dismissed = dismissForm({ ...active, bonusActionAvailable: true })
    val reverted = revertForm({ ...active, bonusActionAvailable: true })
    all {
      assert(dismissed.activeForm == DruidWildShapeTrueForm),
      assert(dismissed.usesRemaining == 1),
      assert(projectedSize(dismissed) == "medium"),
      assert(projectedSpeedFeet(dismissed) == 30),
      assert(reverted.activeForm == DruidWildShapeTrueForm),
      assert(projectedSize(reverted) == "medium"),
      assert(projectedSpeedFeet(reverted) == 30),
    }
  }

  run test_druid_wild_shape_rejects_unavailable_dismiss = {
    val noForm = dismissForm(initialProjection)
    val active = assumeForm(initialProjection, largeFastFormFacts)
    val noBonusAction = dismissForm(active)
    all {
      assert(noForm.activeForm == DruidWildShapeTrueForm),
      assert(noForm.bonusActionAvailable == true),
      assert(noBonusAction.activeForm == active.activeForm),
      assert(noBonusAction.bonusActionAvailable == false),
    }
  }
}
