// -*- mode: Bluespec; -*-

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

  pure def selectedMetamagicOptionsSupportedByQuickenedDirectRestoration(
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): bool =
    selectedOptions == Set(quickenedSpellMetamagicFact)

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
    selectedMetamagicOptionsSupportedByQuickenedDirectRestoration(selectedOptions) and
    sorceryPointsRemaining >= selectedMetamagicSorceryPointCost(selectedOptions) and
    directHitPointRestorationActionCost(invocation) == SpellMagicAction and
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

  run test_quickened_direct_restoration_spends_bonus_action_not_magic_action = {
    val wounded = {
      ...initialState,
      fighter: { ...initialState.fighter, hp: 4 },
    }
    val result = resolveQuickenedDirectHitPointRestoration(
      wounded,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.hp == 12),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_direct_restoration_rejects_prior_level_1_plus_spell = {
    val priorSpell = commitActorSpellSlotUse(initialState, Fighter)
    val result = resolveQuickenedDirectHitPointRestoration(
      priorSpell,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    assert(result == { state: priorSpell, sorceryPointsRemaining: 4 })
  }

  run test_quickened_direct_restoration_rejects_prior_free_level_1_plus_spell = {
    val priorFreeSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
    val result = resolveQuickenedDirectHitPointRestoration(
      priorFreeSpell,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    assert(result == { state: priorFreeSpell, sorceryPointsRemaining: 4 })
  }

  run test_quickened_metamagic_known_affordable_and_stacking_admission = {
    val known = Set(
      quickenedSpellMetamagicFact,
      empoweredSpellMetamagicFact,
      heightenedSpellMetamagicFact,
    )
    all {
      assert(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(selectedMetamagicOptionsCanStack(
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      )),
      assert(not(selectedMetamagicOptionsCanStack(
        Set(quickenedSpellMetamagicFact, heightenedSpellMetamagicFact),
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
        3,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact, heightenedSpellMetamagicFact),
        4,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
        3,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        1,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        HealingWordRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      ))),
    }
  }
}
