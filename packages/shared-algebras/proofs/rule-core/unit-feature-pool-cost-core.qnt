// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.alternate-action-cost unit-feature.bonus-action-dash-temporary-hit-points unit-feature.failed-ability-check-resource-boost unit-feature.innate-sorcery-activation unit-feature.self-bonus-action-healing
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeaturePoolCostCore {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import actionTurnProcedures.* from "./action-turn-procedures"

  // RAW anchors:
  // - Classes/Fighter.md: Second Wind and Tactical Mind.
  // - Classes/Rogue.md: Cunning Action.
  // - Classes/Sorcerer.md: Innate Sorcery activation.
  // - Character-Origins.md: Orc Adrenaline Rush.
  // - Playing-the-Game.md: Bonus Actions and Temporary Hit Points.
  // - Rules-Glossary.md: Dash, Disengage, Hide, and Ability Check.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action and Temporary Hit Points.

  type FeatureUsePool = {
    usesRemaining: int,
    maximumUses: int,
  }

  type InnateSorceryOccurrence =
    | NoInnateSorceryOccurrence
    | InnateSorceryOneMinuteDuration

  type InnateSorceryState = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    occurrence: InnateSorceryOccurrence,
  }

  type SecondWindFacts = {
    healingRoll: int,
    fighterLevel: int,
  }

  type SecondWindResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    recovery: HitPointRecoveryResult,
  }

  type FailedAbilityCheckResourceBoostFacts = {
    originalTotal: int,
    dc: int,
    boostRoll: int,
  }

  type FailedAbilityCheckResourceBoostResult = {
    pool: FeatureUsePool,
    originalSucceeded: bool,
    boostedTotal: int,
    boostedSucceeded: bool,
  }

  type CunningActionChoice =
    | CunningDash
    | CunningDisengage
    | CunningHide

  type CunningActionFacts = {
    choice: CunningActionChoice,
    speedFeet: int,
    hideFacts: HideProcedureFacts,
  }

  type BonusActionDashTemporaryHitPointsFacts = {
    speedFeet: int,
    proficiencyBonus: int,
    existingTemporaryHitPoints: int,
    chooseNewTemporaryHitPoints: bool,
  }

  type BonusActionDashTemporaryHitPointsResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    temporaryHitPoints: int,
  }

  pure def legalFeatureUsePool(pool: FeatureUsePool): bool = all {
    pool.maximumUses >= 0,
    pool.maximumUses <= 6,
    pool.usesRemaining >= 0,
    pool.usesRemaining <= pool.maximumUses,
  }

  pure def spendFeatureUsePool(pool: FeatureUsePool): FeatureUsePool =
    if (pool.usesRemaining <= 0) pool
    else pool.with("usesRemaining", pool.usesRemaining - 1)

  pure def resolveTemporaryHitPointsChoice(
    existingTemporaryHitPoints: int,
    newTemporaryHitPoints: int,
    chooseNewTemporaryHitPoints: bool
  ): int =
    if (chooseNewTemporaryHitPoints) newTemporaryHitPoints
    else existingTemporaryHitPoints

  pure def resolveBonusActionDashTemporaryHitPoints(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: BonusActionDashTemporaryHitPointsFacts
  ): BonusActionDashTemporaryHitPointsResult = {
    val admitted = all {
      legalFeatureUsePool(pool),
      pool.usesRemaining > 0,
      canSpendBonusAction(turn),
      facts.speedFeet >= 0,
      facts.proficiencyBonus >= 2,
      facts.proficiencyBonus <= 6,
      facts.existingTemporaryHitPoints >= 0,
    }
    val dashed =
      if (admitted) resolveDash(turn, facts.speedFeet, BonusActionCost) else turn
    {
      turn: dashed,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      temporaryHitPoints:
        if (admitted) resolveTemporaryHitPointsChoice(
          facts.existingTemporaryHitPoints,
          facts.proficiencyBonus,
          facts.chooseNewTemporaryHitPoints
        ) else facts.existingTemporaryHitPoints,
    }
  }

  pure def legalInnateSorceryState(state: InnateSorceryState): bool = all {
    legalFeatureUsePool(state.pool),
    state.occurrence.in(Set(NoInnateSorceryOccurrence, InnateSorceryOneMinuteDuration)),
    state.occurrence == NoInnateSorceryOccurrence or state.pool.usesRemaining < state.pool.maximumUses,
  }

  pure def activateInnateSorcery(state: InnateSorceryState): InnateSorceryState = {
    val admitted = all {
      legalInnateSorceryState(state),
      canSpendBonusAction(state.turn),
      state.pool.usesRemaining > 0,
      state.occurrence == NoInnateSorceryOccurrence,
    }
    {
      turn: if (admitted) spendActionCost(state.turn, BonusActionCost) else state.turn,
      pool: if (admitted) spendFeatureUsePool(state.pool) else state.pool,
      occurrence: if (admitted) InnateSorceryOneMinuteDuration else state.occurrence,
    }
  }

  pure def legalSecondWindFacts(facts: SecondWindFacts): bool = all {
    facts.healingRoll >= 1,
    facts.healingRoll <= 10,
    facts.fighterLevel >= 1,
    facts.fighterLevel <= 20,
  }

  pure def resolveSecondWind(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    positiveHitPointUnconsciousRecovery: PositiveHitPointUnconsciousRecovery,
    facts: SecondWindFacts
  ): SecondWindResult = {
    val admitted = all {
      legalSecondWindFacts(facts),
      canSpendBonusAction(turn),
      pool.usesRemaining > 0,
    }
    val spentTurn = if (admitted) spendActionCost(turn, BonusActionCost) else turn
    val spentPool = if (admitted) spendFeatureUsePool(pool) else pool
    {
      turn: spentTurn,
      pool: spentPool,
      recovery:
        if (admitted) applyHitPointHealing(
          vitals,
          deathSavingThrows,
          positiveHitPointUnconsciousRecovery,
          facts.healingRoll + facts.fighterLevel
        ) else {
          vitals: vitals,
          deathSavingThrows: deathSavingThrows,
          positiveHitPointUnconsciousRecovery: positiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        },
    }
  }

  pure def legalFailedAbilityCheckResourceBoostFacts(
    facts: FailedAbilityCheckResourceBoostFacts
  ): bool = all {
    facts.boostRoll >= 1,
    facts.boostRoll <= 10,
  }

  pure def resolveFailedAbilityCheckResourceBoost(
    pool: FeatureUsePool,
    facts: FailedAbilityCheckResourceBoostFacts
  ): FailedAbilityCheckResourceBoostResult = {
    val originalSucceeded = facts.originalTotal >= facts.dc
    val boostedTotal = facts.originalTotal + facts.boostRoll
    val boostedSucceeded = boostedTotal >= facts.dc
    val admitted = all {
      legalFeatureUsePool(pool),
      legalFailedAbilityCheckResourceBoostFacts(facts),
      pool.usesRemaining > 0,
      not(originalSucceeded),
    }
    val spend = admitted and boostedSucceeded
    {
      pool: if (spend) spendFeatureUsePool(pool) else pool,
      originalSucceeded: originalSucceeded,
      boostedTotal: boostedTotal,
      boostedSucceeded: boostedSucceeded,
    }
  }

  pure def resolveCunningAction(
    turn: TurnProcedureState,
    facts: CunningActionFacts
  ): TurnProcedureState =
    if (facts.choice == CunningDash) {
      resolveDash(turn, facts.speedFeet, BonusActionCost)
    } else if (facts.choice == CunningDisengage) {
      resolveDisengage(turn, BonusActionCost)
    } else {
      resolveHide(turn, facts.hideFacts, BonusActionCost)
    }
}
