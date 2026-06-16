// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.reaction-roll-or-damage-reduction
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureReactionReductionCore {
  import hitPointDamage.* from "./hit-point-damage"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Classes/Bard.md: College of Lore Cutting Words.
  // - Classes/Rogue.md: Uncanny Dodge.
  // - Classes/Monk.md: Monk's Focus and Deflect Attacks.
  // - Classes/Monk.md: Slow Fall.
  // - Playing-the-Game.md: Reactions and Damage Rolls.
  // - Rules-Glossary.md: Falling.
  // - Rules-Glossary.md: Reaction.
  // - UBIQUITOUS_LANGUAGE.md: Reaction, Offer, Decline, Damage, and Spend.

  type ReactionRollReductionKind =
    | CuttingWordsAttackRollReduction
    | CuttingWordsAbilityCheckReduction

  type CuttingWordsTriggerFacts = {
    creatureSeen: bool,
    creatureWithinSixtyFeet: bool,
  }

  type CuttingWordsRollFacts = {
    trigger: CuttingWordsTriggerFacts,
    kind: ReactionRollReductionKind,
    originalTotal: int,
    dc: int,
    bardicDieRoll: int,
  }

  type CuttingWordsDamageFacts = {
    trigger: CuttingWordsTriggerFacts,
    damageRoll: int,
    bardicDieRoll: int,
  }

  type UncannyDodgeFacts = {
    attackerSeen: bool,
    hitWithAttackRoll: bool,
    incomingDamage: int,
  }

  type DeflectAttacksReductionFacts = {
    incomingDamage: int,
    damageIncludesBludgeoningPiercingOrSlashing: bool,
    deflectRoll: int,
    dexterityModifier: int,
    monkLevel: int,
  }

  type DeflectAttacksRedirectTargetFacts = {
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool,
  }

  type DeflectAttacksRedirectFacts = {
    target: DeflectAttacksRedirectTargetFacts,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexterityModifier: int,
  }

  type SlowFallFacts = {
    incomingFallDamage: int,
    monkLevel: int,
  }

  type CuttingWordsReductionResult = {
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    reducedAmount: int,
  }

  type UncannyDodgeReductionResult = {
    turn: TurnProcedureState,
    reducedAmount: int,
  }

  type DeflectAttacksReductionResult = {
    turn: TurnProcedureState,
    reducedAmount: int,
  }

  type DeflectAttacksRedirectResult = {
    pool: FeatureUsePool,
    redirectedDamage: int,
  }

  type SlowFallReductionResult = {
    turn: TurnProcedureState,
    reducedFallDamage: int,
    fallingPronePrevented: bool,
  }

  pure def cuttingWordsRollTotalAfterReduction(facts: CuttingWordsRollFacts): int =
    nonnegative(facts.originalTotal - facts.bardicDieRoll)

  pure def cuttingWordsTurnsSuccessIntoFailure(facts: CuttingWordsRollFacts): bool = all {
    facts.originalTotal >= facts.dc,
    cuttingWordsRollTotalAfterReduction(facts) < facts.dc,
  }

  pure def cuttingWordsDamageAfterReduction(facts: CuttingWordsDamageFacts): int =
    nonnegative(facts.damageRoll - facts.bardicDieRoll)

  pure def cuttingWordsTriggerAvailable(trigger: CuttingWordsTriggerFacts): bool = all {
    trigger.creatureSeen,
    trigger.creatureWithinSixtyFeet,
  }

  pure def uncannyDodgeDamage(facts: UncannyDodgeFacts): int =
    if (facts.attackerSeen and facts.hitWithAttackRoll) nonnegative(facts.incomingDamage) / 2
    else nonnegative(facts.incomingDamage)

  pure def deflectAttacksDamageAfterReduction(facts: DeflectAttacksReductionFacts): int =
    nonnegative(facts.incomingDamage - (facts.deflectRoll + facts.dexterityModifier + facts.monkLevel))

  pure def slowFallDamageReductionAmount(monkLevel: int): int =
    5 * monkLevel

  pure def slowFallDamageAfterReduction(facts: SlowFallFacts): int =
    nonnegative(facts.incomingFallDamage - slowFallDamageReductionAmount(facts.monkLevel))

  pure def slowFallPreventsFallingProne(reducedFallDamage: int): bool =
    reducedFallDamage == 0

  pure def deflectAttacksRedirectTargetEligible(facts: DeflectAttacksRedirectTargetFacts): bool =
    all {
      facts.targetSeen,
      if (facts.attackWasMelee)
        facts.targetWithinFiveFeet
      else
        all { facts.targetWithinSixtyFeet, not(facts.targetBehindTotalCover) },
    }

  pure def deflectAttacksRedirectDamage(facts: DeflectAttacksRedirectFacts): int =
    if (facts.savingThrowSucceeded) 0
    else nonnegative(facts.firstMartialArtsRoll + facts.secondMartialArtsRoll + facts.dexterityModifier)

  pure def resolveDeflectAttacksReductionReaction(
    turn: TurnProcedureState,
    facts: DeflectAttacksReductionFacts
  ): DeflectAttacksReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      facts.damageIncludesBludgeoningPiercingOrSlashing,
      facts.deflectRoll >= 1,
      facts.deflectRoll <= 10,
      facts.monkLevel >= 3,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      reducedAmount:
        if (admitted) deflectAttacksDamageAfterReduction(facts)
        else nonnegative(facts.incomingDamage),
    }
  }

  pure def resolveDeflectAttacksZeroDamageRedirect(
    pool: FeatureUsePool,
    reducedDamage: int,
    facts: DeflectAttacksRedirectFacts
  ): DeflectAttacksRedirectResult = {
    val admitted = all {
      reducedDamage == 0,
      pool.usesRemaining > 0,
      deflectAttacksRedirectTargetEligible(facts.target),
      facts.firstMartialArtsRoll >= 1,
      facts.secondMartialArtsRoll >= 1,
    }
    {
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      redirectedDamage: if (admitted) deflectAttacksRedirectDamage(facts) else 0,
    }
  }

  pure def resolveSlowFallReaction(
    turn: TurnProcedureState,
    facts: SlowFallFacts
  ): SlowFallReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      facts.monkLevel >= 4,
    }
    val reducedFallDamage =
      if (admitted) slowFallDamageAfterReduction(facts)
      else nonnegative(facts.incomingFallDamage)
    {
      turn: if (admitted) spendReaction(turn) else turn,
      reducedFallDamage: reducedFallDamage,
      fallingPronePrevented: slowFallPreventsFallingProne(reducedFallDamage),
    }
  }

  pure def resolveCuttingWordsDamageReaction(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: CuttingWordsDamageFacts
  ): CuttingWordsReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      pool.usesRemaining > 0,
      cuttingWordsTriggerAvailable(facts.trigger),
      facts.bardicDieRoll >= 1,
      facts.bardicDieRoll <= 12,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      reducedAmount:
        if (admitted) cuttingWordsDamageAfterReduction(facts)
        else nonnegative(facts.damageRoll),
    }
  }

  pure def resolveCuttingWordsRollReaction(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: CuttingWordsRollFacts
  ): CuttingWordsReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      pool.usesRemaining > 0,
      cuttingWordsTriggerAvailable(facts.trigger),
      facts.originalTotal >= facts.dc,
      facts.bardicDieRoll >= 1,
      facts.bardicDieRoll <= 12,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      reducedAmount:
        if (admitted) cuttingWordsRollTotalAfterReduction(facts)
        else nonnegative(facts.originalTotal),
    }
  }

  pure def resolveUncannyDodgeReaction(
    turn: TurnProcedureState,
    facts: UncannyDodgeFacts
  ): UncannyDodgeReductionResult = {
    val admitted = all {
      turn.reactionAvailable,
      facts.attackerSeen,
      facts.hitWithAttackRoll,
    }
    {
      turn: if (admitted) spendReaction(turn) else turn,
      reducedAmount:
        if (admitted) uncannyDodgeDamage(facts)
        else nonnegative(facts.incomingDamage),
    }
  }
}
