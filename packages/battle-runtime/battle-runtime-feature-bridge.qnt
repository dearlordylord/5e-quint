// -*- mode: Bluespec; -*-

module battleRuntimeFeatureBridge {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import unitFeatureProcedureProfiles.* from "../shared-algebras/proofs/rule-core/unit-feature-procedure-profiles"

  type BattleRuntimeRageResistanceProjection = {
    bludgeoning: bool,
    piercing: bool,
    slashing: bool,
  }

  pure def battleRuntimeRageState(active: bool): RageState = {
    turn: initialTurnProcedureState,
    pool: { usesRemaining: if (active) 1 else 0, maximumUses: 1 },
    occurrence: if (active) RageUntilEndOfNextTurn else NoRageOccurrence,
    concentration: {
      interruptedActor: NoConcentration,
      reactor: NoConcentration,
    },
  }

  pure def battleRuntimeRageDamageBonus(barbarianLevel: int): int =
    rageDamageBonus(barbarianLevel)

  pure def battleRuntimeChampionCriticalThreshold(improvedCriticalRange: bool): int =
    attackCriticalThreshold(
      if (improvedCriticalRange)
        ChampionImprovedCriticalThresholdProfile({ attackForm: ChampionWeaponAttack })
      else
        StandardAttackCriticalThresholdProfile
    )

  pure def battleRuntimeRagePreventsSpellcasting(active: bool): bool =
    ragePreventsConcentrationOrSpellcasting(battleRuntimeRageState(active))

  pure def battleRuntimeRageGrantsResistance(
    active: bool,
    damageType: RageResistanceDamageType
  ): bool =
    active and rageGrantsResistance(damageType)

  pure def battleRuntimeRageGrantsBludgeoningResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RageBludgeoningDamage)

  pure def battleRuntimeRageGrantsPiercingResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RagePiercingDamage)

  pure def battleRuntimeRageGrantsSlashingResistance(active: bool): bool =
    battleRuntimeRageGrantsResistance(active, RageSlashingDamage)

  pure def battleRuntimeRageResistanceProjection(active: bool): BattleRuntimeRageResistanceProjection = {
    bludgeoning: battleRuntimeRageGrantsBludgeoningResistance(active),
    piercing: battleRuntimeRageGrantsPiercingResistance(active),
    slashing: battleRuntimeRageGrantsSlashingResistance(active),
  }

  pure def battleRuntimeRecklessAttackState(active: bool, attackRollMadeThisTurn: bool): RecklessAttackState = {
    occurrence: if (active) RecklessAttackUntilStartOfTurn else NoRecklessAttackOccurrence,
    attackRollMadeThisTurn: attackRollMadeThisTurn,
  }

  pure def battleRuntimeRecklessAttackActivates(
    active: bool,
    attackRollMadeThisTurn: bool,
    choosesRecklessAttack: bool,
    strengthAttackRoll: bool
  ): bool = {
    val before = battleRuntimeRecklessAttackState(active, attackRollMadeThisTurn)
    val after = activateRecklessAttackOnFirstAttackRoll(
      before,
      {
        choosesRecklessAttack: choosesRecklessAttack,
        strengthAttackRoll: strengthAttackRoll,
      },
    )
    before.occurrence == NoRecklessAttackOccurrence and after.occurrence == RecklessAttackUntilStartOfTurn
  }

  pure def battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(active: bool): bool =
    recklessAttackGrantsIncomingAttackAdvantage(battleRuntimeRecklessAttackState(active, true))

  pure def battleRuntimeCuttingWordsRollTotal(originalTotal: int, bardicDieRoll: int): int =
    cuttingWordsRollTotalAfterReduction({
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAttackRollReduction,
      originalTotal: originalTotal,
      dc: 0,
      bardicDieRoll: bardicDieRoll,
    })

  pure def battleRuntimeCuttingWordsAbilityCheckAdmitted(
    originalTotal: int,
    dc: int,
    bardicDieRoll: int,
    creatureSeen: bool,
    creatureWithinSixtyFeet: bool,
    reactionAvailable: bool,
    usesRemaining: int
  ): bool =
    resolveCuttingWordsRollReaction(
      initialTurnProcedureState.with("reactionAvailable", reactionAvailable),
      { usesRemaining: usesRemaining, maximumUses: if (usesRemaining > 0) usesRemaining else 0 },
      {
        trigger: {
          creatureSeen: creatureSeen,
          creatureWithinSixtyFeet: creatureWithinSixtyFeet,
        },
        kind: CuttingWordsAbilityCheckReduction,
        originalTotal: originalTotal,
        dc: dc,
        bardicDieRoll: bardicDieRoll,
      },
    ).pool.usesRemaining < usesRemaining

  pure def battleRuntimeUncannyDodgeDamage(damage: int): int =
    resolveUncannyDodgeReaction(
      initialTurnProcedureState,
      {
        attackerSeen: true,
        hitWithAttackRoll: true,
        incomingDamage: damage,
      },
    ).reducedAmount

  pure def battleRuntimeDeflectAttacksDamage(
    damage: int,
    deflectRoll: int,
    dexterityModifier: int,
    monkLevel: int
  ): int =
    deflectAttacksDamageAfterReduction({
      incomingDamage: damage,
      damageIncludesBludgeoningPiercingOrSlashing: true,
      deflectRoll: deflectRoll,
      dexterityModifier: dexterityModifier,
      monkLevel: monkLevel,
    })

  pure def battleRuntimeDeflectAttacksRedirectTargetEligible(
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool
  ): bool =
    deflectAttacksRedirectTargetEligible({
      targetSeen: targetSeen,
      attackWasMelee: attackWasMelee,
      targetWithinFiveFeet: targetWithinFiveFeet,
      targetWithinSixtyFeet: targetWithinSixtyFeet,
      targetBehindTotalCover: targetBehindTotalCover,
    })

  pure def battleRuntimeDeflectAttacksRedirectDamage(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexterityModifier: int
  ): int =
    resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: focusUsesRemaining, maximumUses: if (focusUsesRemaining > 0) focusUsesRemaining else 0 },
      reducedDamage,
      {
        target: {
          targetSeen: targetEligible,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: false,
        },
        savingThrowSucceeded: savingThrowSucceeded,
        firstMartialArtsRoll: firstMartialArtsRoll,
        secondMartialArtsRoll: secondMartialArtsRoll,
        dexterityModifier: dexterityModifier,
      },
    ).redirectedDamage

  pure def battleRuntimeDeflectAttacksRedirectFocusRemaining(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool
  ): int =
    resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: focusUsesRemaining, maximumUses: if (focusUsesRemaining > 0) focusUsesRemaining else 0 },
      reducedDamage,
      {
        target: {
          targetSeen: targetEligible,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: false,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 1,
        secondMartialArtsRoll: 1,
        dexterityModifier: 0,
      },
    ).pool.usesRemaining

  run test_rage_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRageDamageBonus(1) == 2),
      assert(battleRuntimeRageDamageBonus(9) == 3),
      assert(battleRuntimeRageDamageBonus(16) == 4),
      assert(battleRuntimeChampionCriticalThreshold(false) == 20),
      assert(battleRuntimeChampionCriticalThreshold(true) == 19),
      assert(battleRuntimeRagePreventsSpellcasting(true)),
      assert(not(battleRuntimeRagePreventsSpellcasting(false))),
      assert(battleRuntimeRageGrantsResistance(true, RageBludgeoningDamage)),
      assert(not(battleRuntimeRageGrantsResistance(true, RageOtherDamage))),
    }
  }

  run test_reckless_attack_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRecklessAttackActivates(false, false, true, true)),
      assert(not(battleRuntimeRecklessAttackActivates(true, false, true, true))),
      assert(not(battleRuntimeRecklessAttackActivates(false, true, true, true))),
      assert(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(true)),
      assert(not(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(false))),
    }
  }

  run test_reaction_modifier_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeCuttingWordsRollTotal(12, 3) == 9),
      assert(battleRuntimeCuttingWordsAbilityCheckAdmitted(15, 14, 3, true, true, true, 1)),
      assert(battleRuntimeUncannyDodgeDamage(9) == 4),
      assert(battleRuntimeDeflectAttacksDamage(8, 2, 3, 3) == 0),
      assert(battleRuntimeDeflectAttacksRedirectTargetEligible(true, true, true, false, true)),
      assert(not(battleRuntimeDeflectAttacksRedirectTargetEligible(true, false, false, true, true))),
      assert(battleRuntimeDeflectAttacksRedirectDamage(0, 3, true, false, 5, 5, 0) == 10),
      assert(battleRuntimeDeflectAttacksRedirectFocusRemaining(0, 3, true) == 2),
    }
  }
}
