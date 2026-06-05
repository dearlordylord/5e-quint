// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-effective-level-extra-target

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

  type BattleRuntimeTwinnedTargetCountProcedure =
    | TwinnedOneAdditionalCreatureTargetProcedure
    | NonTwinnedTargetCountProcedure

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

  pure def twinnedSpellProcedureSupportsTargetCountProjection(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
  ): bool =
    match procedure {
      | TwinnedOneAdditionalCreatureTargetProcedure => true
      | NonTwinnedTargetCountProcedure => false
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
