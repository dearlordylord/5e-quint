// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.druid-wild-shape-known-form
//
// Focused semantic core for SRD Druid Wild Shape battle form lifecycle state.
// RAW anchors:
// - .references/srd-5.2.1/Classes/Druid.md lines 95-122: Bonus Action known
//   Beast form assumption, use spending, replacement by reuse, early Bonus
//   Action dismissal, Incapacitated/death reversion, Temporary Hit Points,
//   Beast stat-block projection, retained mental statistics/proficiencies, and
//   no spellcasting while shape-shifted; chosen equipment can merge, fall, or
//   be worn when practical, and worn equipment functions normally.
// - .references/srd-5.2.1/Classes/Druid.md lines 160-162: Beast Spells
//   permits level 18 Druids to cast spells while using Wild Shape, except for
//   spells with costed or consumed Material components.
// - .references/srd-5.2.1/Rules-Glossary.md lines 871-874: shape-shifting
//   effects specify their own form rules and revert to true form on death.
// - UBIQUITOUS_LANGUAGE.md: Temporary Hit Points, Stat Block, Action
//   Lifecycle, Spell Definition, Spell Invocation, Spell Component, and
//   Creatures and Stat Blocks.

module battleRuntimeDruidWildShape {
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"

  type DruidWildShapeFormFacts = ShapeShiftedReplacementFormFacts
  type DruidWildShapeFormState = DruidWildShapeRuntimeState
  // This owner admits the battle-visible effective-loadout projection for armor
  // and Shield, worn weapon use gated by the current-form limb witness, plus
  // the explicit object/table outcome boundary for equipment that falls.
  type DruidWildShapeWearableEquipmentResolution =
    EquipmentMerged | EquipmentWorn | EquipmentFell
  type DruidWildShapeHeldEquipmentResolution =
    HeldEquipmentMerged | HeldEquipmentWorn | HeldEquipmentFell
  type DruidWildShapeEquipmentDisposition = {
    wornArmor: bool,
    wornShield: bool,
    wornMainWeapon: bool,
    wornOffHandWeapon: bool,
  }
  type DruidWildShapeEquipmentResolution = {
    armor: DruidWildShapeWearableEquipmentResolution,
    shield: DruidWildShapeWearableEquipmentResolution,
    mainWeapon: DruidWildShapeHeldEquipmentResolution,
    offHandWeapon: DruidWildShapeHeldEquipmentResolution,
  }
  type DruidWildShapeProjection = {
    bonusActionAvailable: bool,
    usesRemaining: int,
    activeForm: DruidWildShapeFormState,
    formCanHandleObjects: bool,
    tempHp: int,
    equipmentDisposition: DruidWildShapeEquipmentDisposition,
  }
  type DruidWildShapeAssumeFormResult = {
    projection: DruidWildShapeProjection,
    droppedEquipmentCount: int,
  }
  type DruidWildShapeSpellMaterialComponent =
    DruidWildShapeNoMaterialComponent
    | DruidWildShapeFocusReplaceableMaterialComponent
    | DruidWildShapePricedMaterialComponent
    | DruidWildShapeConsumedMaterialComponent
    | DruidWildShapeConsumedPricedMaterialComponent

  pure def allMergedEquipmentDisposition: DruidWildShapeEquipmentDisposition = {
    wornArmor: false,
    wornShield: false,
    wornMainWeapon: false,
    wornOffHandWeapon: false,
  }

  pure def allMergedEquipmentResolution: DruidWildShapeEquipmentResolution = {
    armor: EquipmentMerged,
    shield: EquipmentMerged,
    mainWeapon: HeldEquipmentMerged,
    offHandWeapon: HeldEquipmentMerged,
  }

  pure def wornShieldEquipmentDisposition: DruidWildShapeEquipmentResolution = {
    armor: EquipmentMerged,
    shield: EquipmentWorn,
    mainWeapon: HeldEquipmentMerged,
    offHandWeapon: HeldEquipmentMerged,
  }

  pure def wornArmorEquipmentDisposition: DruidWildShapeEquipmentResolution = {
    armor: EquipmentWorn,
    shield: EquipmentMerged,
    mainWeapon: HeldEquipmentMerged,
    offHandWeapon: HeldEquipmentMerged,
  }

  pure def fallenShieldEquipmentDisposition: DruidWildShapeEquipmentResolution = {
    armor: EquipmentMerged,
    shield: EquipmentFell,
    mainWeapon: HeldEquipmentMerged,
    offHandWeapon: HeldEquipmentMerged,
  }

  pure def wornMainWeaponEquipmentDisposition: DruidWildShapeEquipmentResolution = {
    armor: EquipmentMerged,
    shield: EquipmentMerged,
    mainWeapon: HeldEquipmentWorn,
    offHandWeapon: HeldEquipmentMerged,
  }

  pure def initialProjection: DruidWildShapeProjection = {
    bonusActionAvailable: true,
    usesRemaining: 2,
    activeForm: DruidWildShapeTrueForm,
    formCanHandleObjects: true,
    tempHp: 0,
    equipmentDisposition: allMergedEquipmentDisposition,
  }

  pure def proficiencyBonus: int = 2
  pure def druidWildShapeBeastSpellsClassLevel: int = 18
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
  pure def characterArmorBase: int = 16
  pure def shieldArmorClassBonus: int = 2

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
      | DruidWildShapeTrueForm => characterArmorBase
      | DruidWildShapeShifted(data) =>
        (
          if (state.equipmentDisposition.wornArmor)
            characterArmorBase
          else
            data.replacementForm.armorClass
        ) + (if (state.equipmentDisposition.wornShield) shieldArmorClassBonus else 0)
    }

  pure def resolvedWearableEquipmentIsWorn(
    disposition: DruidWildShapeWearableEquipmentResolution,
  ): bool =
    match disposition {
      | EquipmentMerged => false
      | EquipmentWorn => true
      | EquipmentFell => false
    }

  pure def wearableEquipmentFell(
    disposition: DruidWildShapeWearableEquipmentResolution,
  ): int =
    match disposition {
      | EquipmentMerged => 0
      | EquipmentWorn => 0
      | EquipmentFell => 1
    }

  pure def heldEquipmentFell(
    disposition: DruidWildShapeHeldEquipmentResolution,
  ): int =
    match disposition {
      | HeldEquipmentMerged => 0
      | HeldEquipmentWorn => 0
      | HeldEquipmentFell => 1
    }

  pure def heldEquipmentIsWorn(
    disposition: DruidWildShapeHeldEquipmentResolution,
  ): bool =
    match disposition {
      | HeldEquipmentMerged => false
      | HeldEquipmentWorn => true
      | HeldEquipmentFell => false
    }

  pure def droppedEquipmentOutcomeCount(
    disposition: DruidWildShapeEquipmentResolution,
  ): int =
    wearableEquipmentFell(disposition.armor)
      + wearableEquipmentFell(disposition.shield)
      + heldEquipmentFell(disposition.mainWeapon)
      + heldEquipmentFell(disposition.offHandWeapon)

  pure def activeEquipmentDisposition(
    resolution: DruidWildShapeEquipmentResolution,
  ): DruidWildShapeEquipmentDisposition = {
    wornArmor: resolvedWearableEquipmentIsWorn(resolution.armor),
    wornShield: resolvedWearableEquipmentIsWorn(resolution.shield),
    wornMainWeapon: heldEquipmentIsWorn(resolution.mainWeapon),
    wornOffHandWeapon: heldEquipmentIsWorn(resolution.offHandWeapon),
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

  pure def druidWildShapeBeastSpellsAllowsMaterialComponent(
    materialComponent: DruidWildShapeSpellMaterialComponent,
  ): bool =
    match materialComponent {
      | DruidWildShapeNoMaterialComponent => true
      | DruidWildShapeFocusReplaceableMaterialComponent => true
      | DruidWildShapePricedMaterialComponent => false
      | DruidWildShapeConsumedMaterialComponent => false
      | DruidWildShapeConsumedPricedMaterialComponent => false
    }

  pure def druidWildShapeAllowsSpellInvocation(
    state: DruidWildShapeProjection,
    druidLevel: int,
    materialComponent: DruidWildShapeSpellMaterialComponent,
  ): bool =
    match state.activeForm {
      | DruidWildShapeTrueForm => true
      | DruidWildShapeShifted(_) =>
        druidLevel >= druidWildShapeBeastSpellsClassLevel
          and druidWildShapeBeastSpellsAllowsMaterialComponent(materialComponent)
    }

  pure def canUseWornMainWeapon(state: DruidWildShapeProjection): bool =
    match state.activeForm {
      | DruidWildShapeTrueForm => true
      | DruidWildShapeShifted(_) =>
        state.formCanHandleObjects
          and state.equipmentDisposition.wornMainWeapon
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
    assumeFormWithEquipment(state, form, allMergedEquipmentResolution)

  pure def assumeFormWithEquipment(
    state: DruidWildShapeProjection,
    form: DruidWildShapeFormFacts,
    equipmentDisposition: DruidWildShapeEquipmentResolution,
  ): DruidWildShapeProjection =
    assumeFormWithEquipmentAndObjectHandling(state, form, equipmentDisposition, true)

  pure def assumeFormWithEquipmentAndObjectHandling(
    state: DruidWildShapeProjection,
    form: DruidWildShapeFormFacts,
    equipmentDisposition: DruidWildShapeEquipmentResolution,
    formCanHandleObjects: bool,
  ): DruidWildShapeProjection =
    if (canAssumeForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining - 1,
      activeForm: DruidWildShapeShifted({
        source: druidWildShapeSource,
        replacementForm: form,
      }),
      formCanHandleObjects: formCanHandleObjects,
      tempHp: if (state.tempHp > 2) state.tempHp else 2,
      equipmentDisposition: activeEquipmentDisposition(equipmentDisposition),
    } else state

  pure def assumeFormWithEquipmentResult(
    state: DruidWildShapeProjection,
    form: DruidWildShapeFormFacts,
    equipmentDisposition: DruidWildShapeEquipmentResolution,
  ): DruidWildShapeAssumeFormResult =
    if (canAssumeForm(state)) {
      projection: assumeFormWithEquipment(state, form, equipmentDisposition),
      droppedEquipmentCount: droppedEquipmentOutcomeCount(equipmentDisposition),
    } else {
      projection: state,
      droppedEquipmentCount: 0,
    }

  pure def dismissForm(state: DruidWildShapeProjection): DruidWildShapeProjection =
    if (canDismissForm(state)) {
      bonusActionAvailable: false,
      usesRemaining: state.usesRemaining,
      activeForm: druidWildShapeStateAfterReversion(state.activeForm),
      formCanHandleObjects: true,
      tempHp: state.tempHp,
      equipmentDisposition: allMergedEquipmentDisposition,
    } else state

  pure def revertForm(state: DruidWildShapeProjection): DruidWildShapeProjection = {
    bonusActionAvailable: state.bonusActionAvailable,
    usesRemaining: state.usesRemaining,
    activeForm: druidWildShapeStateAfterReversion(state.activeForm),
    formCanHandleObjects: true,
    tempHp: state.tempHp,
    equipmentDisposition: allMergedEquipmentDisposition,
  }

}
