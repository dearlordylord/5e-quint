// -*- mode: Bluespec; -*-

module damageComponentAdjustments {
  import hitPointDamage.* from "./hit-point-damage"

  type RuleDamageType = SlashingDamage | FireDamage | PoisonDamage

  type DamageByType = {
    slashing: int,
    fire: int,
    poison: int,
  }

  type DamageAdjustmentFacts = {
    immuneSlashing: bool,
    immuneFire: bool,
    immunePoison: bool,
    resistantSlashing: bool,
    resistantFire: bool,
    resistantPoison: bool,
    vulnerableSlashing: bool,
    vulnerableFire: bool,
    vulnerablePoison: bool,
  }

  type DamagePair = {
    firstType: RuleDamageType,
    firstAmount: int,
    secondType: RuleDamageType,
    secondAmount: int,
  }

  pure def emptyDamageByType: DamageByType = {
    slashing: 0,
    fire: 0,
    poison: 0,
  }

  pure def noDamageAdjustmentFacts: DamageAdjustmentFacts = {
    immuneSlashing: false,
    immuneFire: false,
    immunePoison: false,
    resistantSlashing: false,
    resistantFire: false,
    resistantPoison: false,
    vulnerableSlashing: false,
    vulnerableFire: false,
    vulnerablePoison: false,
  }

  pure def legalDamageByType(amounts: DamageByType): bool = all {
    amounts.slashing >= 0,
    amounts.fire >= 0,
    amounts.poison >= 0,
  }

  pure def damageAmountForType(amounts: DamageByType, damageType: RuleDamageType): int =
    if (damageType == SlashingDamage) amounts.slashing
    else if (damageType == FireDamage) amounts.fire
    else amounts.poison

  pure def addDamageAmountForType(
    amounts: DamageByType,
    damageType: RuleDamageType,
    rawAmount: int
  ): DamageByType =
    if (damageType == SlashingDamage) {
      slashing: amounts.slashing + nonnegative(rawAmount),
      fire: amounts.fire,
      poison: amounts.poison,
    } else if (damageType == FireDamage) {
      slashing: amounts.slashing,
      fire: amounts.fire + nonnegative(rawAmount),
      poison: amounts.poison,
    } else {
      slashing: amounts.slashing,
      fire: amounts.fire,
      poison: amounts.poison + nonnegative(rawAmount),
    }

  pure def aggregateDamagePair(pair: DamagePair): DamageByType =
    addDamageAmountForType(
      addDamageAmountForType(emptyDamageByType, pair.firstType, pair.firstAmount),
      pair.secondType,
      pair.secondAmount
    )

  pure def adjustedDamageRollAmount(baseAmount: int, modifier: int): int =
    nonnegative(baseAmount + modifier)

  pure def damageTypeIsImmune(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    if (damageType == SlashingDamage) facts.immuneSlashing
    else if (damageType == FireDamage) facts.immuneFire
    else facts.immunePoison

  pure def damageTypeIsResistant(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    if (damageType == SlashingDamage) facts.resistantSlashing
    else if (damageType == FireDamage) facts.resistantFire
    else facts.resistantPoison

  pure def damageTypeIsVulnerable(
    facts: DamageAdjustmentFacts,
    damageType: RuleDamageType
  ): bool =
    if (damageType == SlashingDamage) facts.vulnerableSlashing
    else if (damageType == FireDamage) facts.vulnerableFire
    else facts.vulnerablePoison

  pure def damageAmountAfterTargetAdjustments(
    amount: int,
    damageType: RuleDamageType,
    facts: DamageAdjustmentFacts
  ): int =
    if (damageTypeIsImmune(facts, damageType)) 0
    else {
      val nonnegativeAmount = nonnegative(amount)
      val afterResistance =
        if (damageTypeIsResistant(facts, damageType)) nonnegativeAmount / 2
        else nonnegativeAmount
      if (damageTypeIsVulnerable(facts, damageType)) afterResistance * 2
      else afterResistance
    }

  pure def damageByTypeAfterTargetAdjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts
  ): DamageByType = {
    slashing: damageAmountAfterTargetAdjustments(amounts.slashing, SlashingDamage, facts),
    fire: damageAmountAfterTargetAdjustments(amounts.fire, FireDamage, facts),
    poison: damageAmountAfterTargetAdjustments(amounts.poison, PoisonDamage, facts),
  }

  pure def totalDamageByType(amounts: DamageByType): int =
    amounts.slashing + amounts.fire + amounts.poison

  pure def totalDamageAfterTargetAdjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts
  ): int =
    totalDamageByType(damageByTypeAfterTargetAdjustments(amounts, facts))

  pure def pairTotal(pair: DamagePair): int =
    nonnegative(pair.firstAmount) + nonnegative(pair.secondAmount)

  pure def cappedReduction(total: int, reduction: int): int =
    if (reduction < 0) 0
    else if (reduction > total) total
    else reduction

  pure def largestRemainderBonusGoesToFirst(
    firstAmount: int,
    secondAmount: int,
    reduction: int
  ): bool = {
    val total = firstAmount + secondAmount
    val firstProduct = firstAmount * reduction
    val secondProduct = secondAmount * reduction
    val firstBase = firstProduct / total
    val secondBase = secondProduct / total
    val firstRemainder = firstProduct - (firstBase * total)
    val secondRemainder = secondProduct - (secondBase * total)
    firstRemainder >= secondRemainder
  }

  pure def damagePairAfterScalarReduction(pair: DamagePair, rawReduction: int): DamagePair = {
    val first = nonnegative(pair.firstAmount)
    val second = nonnegative(pair.secondAmount)
    val total = first + second
    if (total == 0) {
      firstType: pair.firstType,
      firstAmount: 0,
      secondType: pair.secondType,
      secondAmount: 0,
    } else {
      val reduction = cappedReduction(total, rawReduction)
      val firstBase = (first * reduction) / total
      val secondBase = (second * reduction) / total
      val baseReduction = firstBase + secondBase
      val extraReduction = reduction - baseReduction
      val firstGetsExtra =
        extraReduction > 0 and largestRemainderBonusGoesToFirst(first, second, reduction)
      val secondGetsExtra = extraReduction > 0 and not(firstGetsExtra)
      {
        firstType: pair.firstType,
        firstAmount: first - firstBase - (if (firstGetsExtra) 1 else 0),
        secondType: pair.secondType,
        secondAmount: second - secondBase - (if (secondGetsExtra) 1 else 0),
      }
    }
  }

  run test_same_type_damage_aggregates_before_resistance = {
    val facts = {
      immuneSlashing: false,
      immuneFire: false,
      immunePoison: false,
      resistantSlashing: true,
      resistantFire: false,
      resistantPoison: false,
      vulnerableSlashing: false,
      vulnerableFire: false,
      vulnerablePoison: false,
    }
    val pair = {
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: SlashingDamage,
      secondAmount: 3,
    }
    all {
      assert(totalDamageAfterTargetAdjustments(aggregateDamagePair(pair), facts) == 4),
      assert((5 / 2) + (3 / 2) == 3),
    }
  }

  run test_modifier_cannot_make_negative_damage = {
    assert(adjustedDamageRollAmount(3, -5) == 0)
  }

  run test_immunity_nullifies_before_resistance_and_vulnerability = {
    val facts = {
      immuneSlashing: false,
      immuneFire: true,
      immunePoison: false,
      resistantSlashing: false,
      resistantFire: true,
      resistantPoison: false,
      vulnerableSlashing: false,
      vulnerableFire: true,
      vulnerablePoison: false,
    }
    assert(damageAmountAfterTargetAdjustments(9, FireDamage, facts) == 0)
  }

  run test_resistance_then_vulnerability_order = {
    val facts = {
      immuneSlashing: false,
      immuneFire: true,
      immunePoison: false,
      resistantSlashing: true,
      resistantFire: false,
      resistantPoison: false,
      vulnerableSlashing: true,
      vulnerableFire: false,
      vulnerablePoison: false,
    }
    all {
      assert(damageAmountAfterTargetAdjustments(7, SlashingDamage, facts) == 6),
      assert(damageAmountAfterTargetAdjustments(7, PoisonDamage, facts) == 7),
    }
  }

  run test_mixed_damage_adjusts_by_type_and_sums = {
    val facts = {
      immuneSlashing: false,
      immuneFire: false,
      immunePoison: true,
      resistantSlashing: true,
      resistantFire: false,
      resistantPoison: false,
      vulnerableSlashing: false,
      vulnerableFire: true,
      vulnerablePoison: false,
    }
    val amounts = {
      slashing: 5,
      fire: 4,
      poison: 6,
    }
    assert(totalDamageAfterTargetAdjustments(amounts, facts) == 10)
  }

  run test_scalar_reduction_allocates_proportionally_by_largest_remainder = {
    val pair = {
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: PoisonDamage,
      secondAmount: 4,
    }
    val result = damagePairAfterScalarReduction(pair, 3)
    all {
      assert(result.firstAmount == 3),
      assert(result.secondAmount == 3),
      assert(pairTotal(result) == 6),
    }
  }

  run test_adjusted_damage_total_feeds_positive_hit_point_damage = {
    val facts = {
      immuneSlashing: false,
      immuneFire: false,
      immunePoison: false,
      resistantSlashing: false,
      resistantFire: false,
      resistantPoison: false,
      vulnerableSlashing: true,
      vulnerableFire: false,
      vulnerablePoison: false,
    }
    val damage = totalDamageAfterTargetAdjustments({
      slashing: 4,
      fire: 0,
      poison: 0,
    }, facts)
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 10,
      hitPointMaximum: 12,
      temporaryHitPoints: 2,
      dead: false,
      unconscious: false,
    }, damage)
    all {
      assert(damage == 8),
      assert(result.vitals.temporaryHitPoints == 0),
      assert(result.vitals.hitPoints == 4),
      assert(legalVitals(result.vitals)),
    }
  }
}
