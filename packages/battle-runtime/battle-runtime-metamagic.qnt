// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagic {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  type BattleRuntimeMetamagicEffectKind =
    | QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit
    | DamageDiceRerollStackingException
    | SavingThrowProtection
    | SavingThrowDisadvantage

  type BattleRuntimeMetamagicStackingMode =
    | OnePerSpell
    | CanCombineWithDifferentMetamagic

  type BattleRuntimeMetamagicOptionFact = {
    effectKind: BattleRuntimeMetamagicEffectKind,
    stackingMode: BattleRuntimeMetamagicStackingMode,
    sorceryPointCost: int,
  }

  type BattleRuntimeQuickenedMetamagicResult = {
    state: BattleState,
    sorceryPointsRemaining: int,
  }

  type BattleRuntimeQuickenedActionSpellProcedure =
    | QuickenedDirectRestorationProcedure
    | QuickenedScalarBuffProcedure
    | QuickenedDamageProcedure
    | QuickenedControlProcedure
    | QuickenedOngoingEffectProcedure
    | QuickenedOtherActionProcedure

  type BattleRuntimeSaveMetamagicProcedure =
    | SaveGatedDamageProcedure({ success: SaveGatedDamageSuccess })
    | SaveGatedNonDamageProcedure
    | SleepTargetAdmissionProcedure
    | NonSaveMetamagicProcedure

  pure val quickenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact = {
    effectKind: QuickenedActionCastingTimeToBonusActionWithSpellTurnLimit,
    stackingMode: OnePerSpell,
    sorceryPointCost: 2,
  }

  pure val empoweredSpellMetamagicFact: BattleRuntimeMetamagicOptionFact = {
    effectKind: DamageDiceRerollStackingException,
    stackingMode: CanCombineWithDifferentMetamagic,
    sorceryPointCost: 1,
  }

  pure val carefulSpellMetamagicFact: BattleRuntimeMetamagicOptionFact = {
    effectKind: SavingThrowProtection,
    stackingMode: OnePerSpell,
    sorceryPointCost: 1,
  }

  pure val heightenedSpellMetamagicFact: BattleRuntimeMetamagicOptionFact = {
    effectKind: SavingThrowDisadvantage,
    stackingMode: OnePerSpell,
    sorceryPointCost: 2,
  }

  pure def selectedMetamagicOptionsKnown(
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions.forall(option => knownOptions.contains(option))

  pure def selectedMetamagicSorceryPointCost(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): int =
    selectedOptions
      .map(option => option.sorceryPointCost)
      .fold(0, (total, cost) => total + cost)

  pure def selectedMetamagicOptionsCanStack(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions.size() <= 1 or (
      selectedOptions.size() == 2 and
      selectedOptions.exists(option => option.stackingMode == CanCombineWithDifferentMetamagic)
    )

  pure def selectedMetamagicOptionsSupportedByQuickenedActionSpell(
    procedure: BattleRuntimeQuickenedActionSpellProcedure,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions == Set(quickenedSpellMetamagicFact) and
    quickenedActionSpellProcedureSupportsBonusActionRewrite(procedure)

  pure def quickenedActionSpellProcedureSupportsBonusActionRewrite(
    procedure: BattleRuntimeQuickenedActionSpellProcedure,
  ): bool =
    match procedure {
      | QuickenedDirectRestorationProcedure => true
      | QuickenedScalarBuffProcedure => true
      | QuickenedDamageProcedure => false
      | QuickenedControlProcedure => false
      | QuickenedOngoingEffectProcedure => false
      | QuickenedOtherActionProcedure => false
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
    selectedOptions.size() > 0 and
    selectedMetamagicOptionsKnown(knownOptions, selectedOptions) and
    selectedMetamagicOptionsCanStack(selectedOptions) and
    selectedMetamagicOptionsSupportedBySaveSpell(procedure, selectedOptions) and
    sorceryPointsRemaining >= selectedMetamagicSorceryPointCost(selectedOptions)

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
    selectedMetamagicOptionsKnown(knownOptions, selectedOptions) and
    selectedMetamagicOptionsCanStack(selectedOptions) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedDirectRestorationProcedure, selectedOptions) and
    sorceryPointsRemaining >= selectedMetamagicSorceryPointCost(selectedOptions) and
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
    selectedMetamagicOptionsKnown(knownOptions, selectedOptions) and
    selectedMetamagicOptionsCanStack(selectedOptions) and
    selectedMetamagicOptionsSupportedByQuickenedActionSpell(QuickenedScalarBuffProcedure, selectedOptions) and
    sorceryPointsRemaining >= selectedMetamagicSorceryPointCost(selectedOptions) and
    scalarBuffActionCost(invocation) == SpellMagicAction and
    state.bonusActionAvailable and
    not(battleActorHasCastLevelOnePlusSpellThisTurn(state, currentActor(state)))

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

}
