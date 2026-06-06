// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-component-suppression
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-component-suppression
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-dice-reroll

module battleRuntimeMetamagic {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeConditionSpellResolution.* from "./battle-runtime-condition-spell-resolution"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  type BattleRuntimeQuickenedMetamagicResult = {
    state: BattleState,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeTwinnedTargetCountResult = {
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    maximumTargets: int,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeDistantRangeResult = {
    rangeFeet: int,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeExtendedDurationResult = {
    durationTicks: int,
    concentrationSavingThrowMode: SavingThrowRollMode,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeSubtleComponentProjectionResult = {
    verbalSuppressed: bool,
    somaticSuppressed: bool,
    materialSuppressed: bool,
    materialPreserved: bool,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeSeekingSpellAttackRerollResult = {
    finalTotal: int,
    finalNaturalD20: int,
    hit: bool,
    critical: bool,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeEmpoweredSpellDamageRerollResult = {
    finalDamageTotal: int,
    selectedDice: int,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeEmpoweredSpellDamageDieReroll = {
    selectedDieOrdinal: int,
    original: int,
    replacement: int,
  }

  type BattleRuntimeSaveMetamagicProcedure =
    | SaveGatedDamageProcedure({ success: SaveGatedDamageSuccess })
    | SaveGatedNonDamageProcedure
    | SleepTargetAdmissionProcedure
    | NonSaveMetamagicProcedure

  type BattleRuntimeTransmutedDamageProcedure =
    | TransmutedSaveGatedDamageProcedure
    | TransmutedSpellAttackDamageProcedure
    | TransmutedSpellAttackSequenceProcedure
    | NonTransmutedDamageProcedure

  type BattleRuntimeSeekingSpellAttackRerollProcedure =
    | SeekingSpellAttackDamageProcedure
    | SeekingSpellAttackSequenceProcedure
    | NonSeekingSpellAttackProcedure

  type BattleRuntimeEmpoweredSpellDamageRerollProcedure =
    | EmpoweredSpellAttackDamageProcedure
    | EmpoweredSpellAttackSequenceProcedure
    | NonEmpoweredSpellDamageProcedure

  type BattleRuntimeTwinnedTargetCountProcedure =
    | TwinnedOneAdditionalCreatureTargetProcedure
    | NonTwinnedTargetCountProcedure

  type BattleRuntimeDistantRangeProcedure =
    | DistantRangeBearingTargetProcedure
    | NonDistantRangeProcedure

  type BattleRuntimeExtendedDurationProcedure =
    | ExtendedDurationBearingProcedure
    | NonExtendedDurationProcedure

  type BattleRuntimeSpellRangeShape =
    | SpellRangeFeet({ feet: int })
    | SpellRangeTouch
    | SpellRangeSelf

  type BattleRuntimeSpellDurationShape =
    | SpellTimedDurationTicks({ durationTicks: int })
    | SpellConcentrationDurationTicks({ durationTicks: int })
    | SpellInstantaneousDuration

  type BattleRuntimeMaterialComponentRequirement =
    | NoMaterialComponent
    | FocusReplaceableMaterialComponent
    | PricedMaterialComponent
    | ConsumedMaterialComponent
    | ConsumedPricedMaterialComponent

  type BattleRuntimeSpellComponentRequirements = {
    verbal: bool,
    somatic: bool,
    material: BattleRuntimeMaterialComponentRequirement,
  }

  pure def selectedMetamagicOptionsSupportedBySaveSpell(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    (
      selectedOptions == Set(carefulSpellMetamagicFact) or
      selectedOptions == Set(heightenedSpellMetamagicFact)
    ) and saveMetamagicProcedureSupportsSaveMetamagic(procedure)

  pure def saveMetamagicProcedureSupportsSaveMetamagic(
    procedure: BattleRuntimeSaveMetamagicProcedure,
  ): bool =
    match procedure {
      | SaveGatedDamageProcedure(_) => true
      | SaveGatedNonDamageProcedure => true
      | SleepTargetAdmissionProcedure => false
      | NonSaveMetamagicProcedure => false
    }

  pure def saveMetamagicCanModifySaveSpell(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedBySaveSpell(procedure, selectedOptions)

  pure def transmutedSpellDamageTypeAllowed(damageType: DamageType): bool =
    damageType == Acid or
    damageType == Cold or
    damageType == Fire or
    damageType == Lightning or
    damageType == Poison or
    damageType == Thunder

  pure def transmutedSpellProcedureSupportsDamageSubstitution(
    procedure: BattleRuntimeTransmutedDamageProcedure,
  ): bool =
    match procedure {
      | TransmutedSaveGatedDamageProcedure => true
      | TransmutedSpellAttackDamageProcedure => true
      | TransmutedSpellAttackSequenceProcedure => true
      | NonTransmutedDamageProcedure => false
    }

  pure def transmutedSpellCanModifyDamageSpell(
    procedure: BattleRuntimeTransmutedDamageProcedure,
    sourceDamageType: DamageType,
    targetDamageType: DamageType,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(transmutedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    transmutedSpellProcedureSupportsDamageSubstitution(procedure) and
    transmutedSpellDamageTypeAllowed(sourceDamageType) and
    transmutedSpellDamageTypeAllowed(targetDamageType) and
    sourceDamageType != targetDamageType

  pure def transmutedSpellDamageTypeProjection(
    procedure: BattleRuntimeTransmutedDamageProcedure,
    sourceDamageType: DamageType,
    targetDamageType: DamageType,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): DamageType =
    if (
      transmutedSpellCanModifyDamageSpell(
        procedure,
        sourceDamageType,
        targetDamageType,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    )
      targetDamageType
    else
      sourceDamageType

  pure def seekingSpellProcedureSupportsMissedSpellAttackReroll(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
  ): bool =
    match procedure {
      | SeekingSpellAttackDamageProcedure => true
      | SeekingSpellAttackSequenceProcedure => false
      | NonSeekingSpellAttackProcedure => false
    }

  pure def seekingSpellAttackRollHits(
    total: int,
    naturalD20: int,
    armorClass: int,
  ): bool =
    if (naturalD20 == 1)
      false
    else if (naturalD20 == 20)
      true
    else
      total >= armorClass

  pure def seekingSpellAttackRollIsCritical(naturalD20: int): bool =
    naturalD20 == 20

  pure def seekingSpellSelectedMetamagicOptions(
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): Set[BattleRuntimeMetamagicOptionFact] =
    castOptions.union(Set(seekingSpellMetamagicFact))

  pure def seekingSpellCanRerollMissedSpellAttack(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
    originalTotal: int,
    originalNaturalD20: int,
    armorClass: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    knownOptions.contains(seekingSpellMetamagicFact) and
    not(castOptions.contains(seekingSpellMetamagicFact)) and
    selectedMetamagicOptionsCanStack(seekingSpellSelectedMetamagicOptions(castOptions)) and
    selectedMetamagicOptionsAffordable(seekingSpellSelectedMetamagicOptions(castOptions), sorceryPointsRemaining) and
    seekingSpellProcedureSupportsMissedSpellAttackReroll(procedure) and
    not(seekingSpellAttackRollHits(originalTotal, originalNaturalD20, armorClass))

  pure def resolveSeekingSpellAttackReroll(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
    originalTotal: int,
    originalNaturalD20: int,
    replacementTotal: int,
    replacementNaturalD20: int,
    armorClass: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeSeekingSpellAttackRerollResult = {
    val admitted = seekingSpellCanRerollMissedSpellAttack(
      procedure,
      originalTotal,
      originalNaturalD20,
      armorClass,
      knownOptions,
      castOptions,
      sorceryPointsRemaining,
    )
    val finalTotal = if (admitted) replacementTotal else originalTotal
    val finalNaturalD20 =
      if (admitted) replacementNaturalD20 else originalNaturalD20
    {
      finalTotal: finalTotal,
      finalNaturalD20: finalNaturalD20,
      hit: seekingSpellAttackRollHits(finalTotal, finalNaturalD20, armorClass),
      critical: seekingSpellAttackRollIsCritical(finalNaturalD20),
      sorceryPointsRemaining:
        if (admitted)
          sorceryPointsRemaining - selectedMetamagicSorceryPointCost(seekingSpellSelectedMetamagicOptions(castOptions))
        else
          sorceryPointsRemaining,
    }
  }

  pure def empoweredSpellProcedureSupportsDamageDiceReroll(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
  ): bool =
    match procedure {
      | EmpoweredSpellAttackDamageProcedure => true
      | EmpoweredSpellAttackSequenceProcedure => false
      | NonEmpoweredSpellDamageProcedure => false
    }

  pure def empoweredSpellSelectedMetamagicOptions(
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): Set[BattleRuntimeMetamagicOptionFact] =
    castOptions.union(Set(empoweredSpellMetamagicFact))

  pure def empoweredSpellMaximumSelectedDice(charismaModifier: int): int =
    if (charismaModifier < 1) 1 else charismaModifier

  pure def empoweredSpellSelectedDamageDiceCount(
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
  ): int =
    selectedRerolls.size()

  pure def empoweredSpellSelectedOriginalTotal(
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
  ): int =
    selectedRerolls.map(reroll => reroll.original).fold(0, (total, original) => total + original)

  pure def empoweredSpellReplacementTotal(
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
  ): int =
    selectedRerolls.map(reroll => reroll.replacement).fold(0, (total, replacement) => total + replacement)

  pure def empoweredSpellSelectedDamageRerollsValid(
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
    damageDieSize: int,
  ): bool =
    selectedRerolls.size() > 0 and
    selectedRerolls.forall(reroll =>
      reroll.selectedDieOrdinal >= 0 and
      reroll.original >= 1 and
      reroll.original <= damageDieSize and
      reroll.replacement >= 1 and
      reroll.replacement <= damageDieSize
    ) and
    selectedRerolls.forall(left =>
      selectedRerolls.forall(right =>
        left.selectedDieOrdinal != right.selectedDieOrdinal or left == right
      )
    )

  pure def empoweredSpellCanRerollDamageDice(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
    damageDieSize: int,
    charismaModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool = {
    val selectedDice = empoweredSpellSelectedDamageDiceCount(selectedRerolls)
    knownOptions.contains(empoweredSpellMetamagicFact) and
    not(castOptions.contains(empoweredSpellMetamagicFact)) and
    empoweredSpellSelectedDamageRerollsValid(selectedRerolls, damageDieSize) and
    selectedDice <= empoweredSpellMaximumSelectedDice(charismaModifier) and
    selectedMetamagicOptionsCanStack(empoweredSpellSelectedMetamagicOptions(castOptions)) and
    selectedMetamagicOptionsAffordable(empoweredSpellSelectedMetamagicOptions(castOptions), sorceryPointsRemaining) and
    empoweredSpellProcedureSupportsDamageDiceReroll(procedure)
  }

  pure def resolveEmpoweredSpellDamageReroll(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
    originalDamageTotal: int,
    damageDieSize: int,
    selectedRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll],
    charismaModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeEmpoweredSpellDamageRerollResult = {
    val selectedDice = empoweredSpellSelectedDamageDiceCount(selectedRerolls)
    val admitted = empoweredSpellCanRerollDamageDice(
      procedure,
      selectedRerolls,
      damageDieSize,
      charismaModifier,
      knownOptions,
      castOptions,
      sorceryPointsRemaining,
    )
    {
      finalDamageTotal:
        if (admitted)
          originalDamageTotal - empoweredSpellSelectedOriginalTotal(selectedRerolls) + empoweredSpellReplacementTotal(selectedRerolls)
        else
          originalDamageTotal,
      selectedDice: if (admitted) selectedDice else 0,
      sorceryPointsRemaining:
        if (admitted)
          sorceryPointsRemaining - selectedMetamagicSorceryPointCost(empoweredSpellSelectedMetamagicOptions(castOptions))
        else
          sorceryPointsRemaining,
    }
  }

  pure def twinnedSpellProcedureSupportsTargetCountProjection(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
  ): bool =
    match procedure {
      | TwinnedOneAdditionalCreatureTargetProcedure => true
      | NonTwinnedTargetCountProcedure => false
    }

  pure def distantSpellProcedureSupportsRangeProjection(
    procedure: BattleRuntimeDistantRangeProcedure,
  ): bool =
    match procedure {
      | DistantRangeBearingTargetProcedure => true
      | NonDistantRangeProcedure => false
    }

  pure def distantSpellRangeShapeAdmitted(spellRange: BattleRuntimeSpellRangeShape): bool =
    match spellRange {
      | SpellRangeTouch => true
      | SpellRangeFeet(data) => data.feet >= 5
      | SpellRangeSelf => false
    }

  pure def distantSpellEffectiveRangeFeet(spellRange: BattleRuntimeSpellRangeShape): int =
    match spellRange {
      | SpellRangeTouch => 30
      | SpellRangeFeet(data) => data.feet * 2
      | SpellRangeSelf => 0
    }

  pure def extendedSpellProcedureSupportsDurationProjection(
    procedure: BattleRuntimeExtendedDurationProcedure,
  ): bool =
    match procedure {
      | ExtendedDurationBearingProcedure => true
      | NonExtendedDurationProcedure => false
    }

  pure def extendedSpellMaximumDurationTicks = 14400
  pure def extendedSpellMinimumEligibleDurationTicks = 10

  pure def extendedSpellDurationShapeAdmitted(duration: BattleRuntimeSpellDurationShape): bool =
    match duration {
      | SpellTimedDurationTicks(data) =>
        data.durationTicks >= extendedSpellMinimumEligibleDurationTicks
      | SpellConcentrationDurationTicks(data) =>
        data.durationTicks >= extendedSpellMinimumEligibleDurationTicks
      | SpellInstantaneousDuration => false
    }

  pure def extendedSpellBaseDurationTicks(duration: BattleRuntimeSpellDurationShape): int =
    match duration {
      | SpellTimedDurationTicks(data) => data.durationTicks
      | SpellConcentrationDurationTicks(data) => data.durationTicks
      | SpellInstantaneousDuration => 0
    }

  pure def extendedSpellEffectiveDurationTicks(duration: BattleRuntimeSpellDurationShape): int = {
    val doubled = extendedSpellBaseDurationTicks(duration) * 2
    if (doubled > extendedSpellMaximumDurationTicks)
      extendedSpellMaximumDurationTicks
    else
      doubled
  }

  pure def extendedSpellConcentrationMaintenanceSavingThrowMode(
    duration: BattleRuntimeSpellDurationShape,
  ): SavingThrowRollMode =
    match duration {
      | SpellConcentrationDurationTicks(_) => AdvantageSavingThrow
      | SpellTimedDurationTicks(_) => NormalSavingThrow
      | SpellInstantaneousDuration => NormalSavingThrow
    }

  pure def subtleSpellMaterialComponentSuppressed(
    material: BattleRuntimeMaterialComponentRequirement,
  ): bool =
    match material {
      | FocusReplaceableMaterialComponent => true
      | NoMaterialComponent => false
      | PricedMaterialComponent => false
      | ConsumedMaterialComponent => false
      | ConsumedPricedMaterialComponent => false
    }

  pure def subtleSpellMaterialComponentPreserved(
    material: BattleRuntimeMaterialComponentRequirement,
  ): bool =
    match material {
      | PricedMaterialComponent => true
      | ConsumedMaterialComponent => true
      | ConsumedPricedMaterialComponent => true
      | NoMaterialComponent => false
      | FocusReplaceableMaterialComponent => false
    }

  pure def subtleSpellComponentRequirementsAdmitted(
    components: BattleRuntimeSpellComponentRequirements,
  ): bool =
    components.verbal or
    components.somatic or
    components.material != NoMaterialComponent

  pure def subtleSpellCanModifyComponentSpell(
    components: BattleRuntimeSpellComponentRequirements,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(subtleSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    subtleSpellComponentRequirementsAdmitted(components)

  pure def resolveSubtleSpellComponentProjection(
    components: BattleRuntimeSpellComponentRequirements,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeSubtleComponentProjectionResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      subtleSpellCanModifyComponentSpell(
        components,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        verbalSuppressed: components.verbal,
        somaticSuppressed: components.somatic,
        materialSuppressed:
          subtleSpellMaterialComponentSuppressed(components.material),
        materialPreserved:
          subtleSpellMaterialComponentPreserved(components.material),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        verbalSuppressed: false,
        somaticSuppressed: false,
        materialSuppressed: false,
        materialPreserved: false,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def extendedSpellCanModifyDurationSpell(
    procedure: BattleRuntimeExtendedDurationProcedure,
    duration: BattleRuntimeSpellDurationShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(extendedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    extendedSpellProcedureSupportsDurationProjection(procedure) and
    extendedSpellDurationShapeAdmitted(duration)

  pure def resolveExtendedSpellDurationProjection(
    procedure: BattleRuntimeExtendedDurationProcedure,
    duration: BattleRuntimeSpellDurationShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeExtendedDurationResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      extendedSpellCanModifyDurationSpell(
        procedure,
        duration,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        durationTicks: extendedSpellEffectiveDurationTicks(duration),
        concentrationSavingThrowMode:
          extendedSpellConcentrationMaintenanceSavingThrowMode(duration),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        durationTicks: 0,
        concentrationSavingThrowMode: NormalSavingThrow,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def distantSpellCanModifyRangeSpell(
    procedure: BattleRuntimeDistantRangeProcedure,
    spellRange: BattleRuntimeSpellRangeShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(distantSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    distantSpellProcedureSupportsRangeProjection(procedure) and
    distantSpellRangeShapeAdmitted(spellRange)

  pure def resolveDistantSpellRangeProjection(
    procedure: BattleRuntimeDistantRangeProcedure,
    spellRange: BattleRuntimeSpellRangeShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeDistantRangeResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      distantSpellCanModifyRangeSpell(
        procedure,
        spellRange,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        rangeFeet: distantSpellEffectiveRangeFeet(spellRange),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        rangeFeet: 0,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def twinnedSpellCanModifyTargetCountSpell(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    currentMaximumTargets: int,
    effectiveMaximumTargets: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(twinnedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    twinnedSpellProcedureSupportsTargetCountProjection(procedure) and
    actualSlotLevel >= 1 and
    actualSlotLevel < 9 and
    effectiveSpellLevel == actualSlotLevel + 1 and
    currentMaximumTargets >= 1 and
    effectiveMaximumTargets == currentMaximumTargets + 1

  pure def resolveTwinnedTargetCountProjection(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    currentMaximumTargets: int,
    effectiveMaximumTargets: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeTwinnedTargetCountResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      twinnedSpellCanModifyTargetCountSpell(
        procedure,
        actualSlotLevel,
        effectiveSpellLevel,
        currentMaximumTargets,
        effectiveMaximumTargets,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        actualSlotLevel: actualSlotLevel,
        effectiveSpellLevel: effectiveSpellLevel,
        maximumTargets: effectiveMaximumTargets,
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        actualSlotLevel: actualSlotLevel,
        effectiveSpellLevel: actualSlotLevel,
        maximumTargets: currentMaximumTargets,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def carefulSpellMaxProtectedTargets(charismaModifier: int): int =
    if (charismaModifier < 1) 1 else charismaModifier

  pure def carefulSpellProtectedTargetSelectionValid(
    spellTargets: Set[Actor],
    protectedTargets: Set[Actor],
    charismaModifier: int,
  ): bool =
    protectedTargets.size() >= 1 and
    protectedTargets.size() <= carefulSpellMaxProtectedTargets(charismaModifier) and
    protectedTargets.forall(target => spellTargets.contains(target))

  pure def heightenedSpellTargetSelectionValid(
    spellTargets: Set[Actor],
    target: Actor,
  ): bool =
    spellTargets.contains(target)

  pure def savingThrowRollModeWithHeightenedSpell(
    baseMode: SavingThrowRollMode,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    target: Actor,
    heightenedTarget: Actor,
  ): SavingThrowRollMode =
    if (
      selectedOptions.contains(heightenedSpellMetamagicFact) and
      target == heightenedTarget
    )
      combineSavingThrowRollModes(baseMode, DisadvantageSavingThrow)
    else
      baseMode

  pure def combineSavingThrowRollModes(
    baseMode: SavingThrowRollMode,
    addedMode: SavingThrowRollMode,
  ): SavingThrowRollMode =
    if (baseMode == NormalSavingThrow)
      addedMode
    else if (addedMode == NormalSavingThrow)
      baseMode
    else if (baseMode == addedMode)
      baseMode
    else
      NormalSavingThrow

  pure def carefulSpellSuppressesSuccessfulHalfDamage(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    protectedTargets: Set[Actor],
    target: Actor,
    saveSucceeded: bool,
  ): bool =
    selectedOptions.contains(carefulSpellMetamagicFact) and
    saveSucceeded and
    protectedTargets.contains(target) and
    saveMetamagicProcedureHasHalfDamageSuccess(procedure)

  pure def saveMetamagicProcedureHasHalfDamageSuccess(
    procedure: BattleRuntimeSaveMetamagicProcedure,
  ): bool =
    match procedure {
      | SaveGatedDamageProcedure(data) => data.success == HalfDamageOnSaveSuccess
      | SaveGatedNonDamageProcedure => false
      | SleepTargetAdmissionProcedure => false
      | NonSaveMetamagicProcedure => false
    }

  pure def quickenedSpellCanModifyDirectRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedDirectRestorationProcedure, selectedOptions) and
    directHitPointRestorationActionCost(invocation) == SpellMagicAction and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifyScalarBuff(
    state: BattleState,
    invocation: ScalarBuffSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedScalarBuffProcedure, selectedOptions) and
    scalarBuffActionCost(invocation) == SpellMagicAction and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifySaveGatedDamage(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedDamageProcedure, selectedOptions) and
    saveGatedDamageHasMagicActionCastingTime(invocation) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifySaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedConditionProcedure, selectedOptions) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifySaveGatedConditionImmunity(
    state: BattleState,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSaveGatedConditionImmunityProcedure, selectedOptions) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifyDirectCondition(
    state: BattleState,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedDirectConditionProcedure, selectedOptions) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifyRollModifier(
    state: BattleState,
    invocation: RollModifierSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedRollModifierProcedure, selectedOptions) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def quickenedSpellCanModifySpellAttackDamage(
    state: BattleState,
    invocation: SpellAttackDamageInvocation,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions.contains(quickenedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedSpellAttackProcedure, selectedOptions) and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

  pure def saveGatedDamageHasMagicActionCastingTime(
    invocation: SaveGatedDamageInvocation,
  ): bool =
    saveGatedDamageCastingTime(invocation) == SaveGatedDamageActionCastingTime

  pure def resolveQuickenedDirectHitPointRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    targetCount: int,
    healingRoll: int,
    spellcastingAbilityModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyDirectRestoration(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val validTargetCount =
      targetCount >= 1 and targetCount <= directHitPointRestorationMaximumTargets(invocation)
    if (
      currentActor(state) == Fighter and
      canModify and
      validTargetCount and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val healed = applyHealing(
        state.fighter,
        directHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier),
      )
      {
        state: commitActorQuickenedLevelOnePlusSpellCast(commitActorSpellSlotUse({
          ...spendFighterSpellActionCost(state, SpellBonusAction),
          fighter: healed,
        }, Fighter), Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def resolveQuickenedScalarBuffSpell(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    knownWillingTargets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyScalarBuff(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val resolved =
      if (canModify)
        resolveScalarBuffSpellWithActionCost(
          state,
          invocation,
          SpellBonusAction,
          targets,
          knownWillingTargets,
          slotLevel,
          rolledDice,
        )
      else
        state
    if (canModify and resolved != state) {
      {
        state: commitActorQuickenedLevelOnePlusSpellCast(resolved, Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def resolveQuickenedBurningHands(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySaveGatedDamage(
      state,
      BurningHandsSaveGate,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    if (
      canModify and
      currentActor(state) == Fighter and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      canExpendSpellSlotThisTurn(state)
    ) {
      {
        state: commitActorQuickenedLevelOnePlusSpellCast(commitActorSpellSlotUse({
          ...spendFighterSpellActionCost(state, SpellBonusAction),
          fighter: saveGatedDamageTarget(BurningHandsSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
          goblin: saveGatedDamageTarget(BurningHandsSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        }, Fighter), Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

  pure def quickenedActionSpellResult(
    before: BattleState,
    resolvedAsMagicAction: BattleState,
    selectedCost: int,
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult =
    if (resolvedAsMagicAction != { ...before, actionAvailable: true }) {
      {
        state: commitActorQuickenedLevelOnePlusSpellCast({
          ...resolvedAsMagicAction,
          actionAvailable: before.actionAvailable,
          bonusActionAvailable: false,
        }, Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: before,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }

  pure def resolveQuickenedColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySaveGatedCondition(
      state,
      ColorSpraySaveGate,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveColorSpray(actionProbe, fighterSavingThrowSucceeded, goblinSavingThrowSucceeded),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }

  pure def resolveQuickenedCalmEmotions(
    state: BattleState,
    fighterIncluded: bool,
    fighterSavingThrowSucceeded: bool,
    goblinIncluded: bool,
    goblinSavingThrowSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySaveGatedConditionImmunity(
      state,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveCalmEmotions(
          actionProbe,
          fighterIncluded,
          HumanoidCreature,
          fighterSavingThrowSucceeded,
          goblinIncluded,
          HumanoidCreature,
          goblinSavingThrowSucceeded,
        ),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }

  pure def resolveQuickenedInvisibility(
    state: BattleState,
    targets: Set[Actor],
    slotLevel: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyDirectCondition(
      state,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveInvisibilityConditionSpell(actionProbe, targets, slotLevel),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }

  pure def resolveQuickenedRollModifierChoiceSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyRollModifier(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveRollModifierChoiceSpell(
          actionProbe,
          invocation,
          selectedTargets,
          failedSaveTargets,
          slotLevel,
          chosenAbility,
          chosenSkill,
        ),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }

  pure def resolveQuickenedRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySpellAttackDamage(
      state,
      RayOfFrostSpellAttack,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    if (
      canModify and
      currentActor(state) == Fighter and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val resolvedAsMagicAction = resolveRayOfFrost(
        { ...state, actionAvailable: true },
        attackTotal,
        naturalD20,
        damageRoll,
        concentrationSaveSucceeded,
      )
      {
        state: commitActorQuickenedLevelOnePlusSpellCast({
          ...resolvedAsMagicAction,
          actionAvailable: state.actionAvailable,
          bonusActionAvailable: false,
        }, Fighter),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        state: state,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }

}
