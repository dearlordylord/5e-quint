// -*- mode: Bluespec; -*-

module damageComponentAdjustmentsInductive {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  type AdjustmentFixture =
    | NoAdjustments
    | SlashingResistance
    | FireVulnerability
    | PoisonImmunity
    | SlashingResistanceFireVulnerability

  var qSlashing: int
  var qFire: int
  var qPoison: int
  var qTotal: int

  pure def qDamageByType: DamageByType =
    emptyDamageByType
      .set(FireDamage, qFire)
      .set(PoisonDamage, qPoison)
      .set(SlashingDamage, qSlashing)

  pure def factsForFixture(fixture: AdjustmentFixture): DamageAdjustmentFacts =
    if (fixture == SlashingResistance)
      noDamageAdjustmentFacts.with("resistances", Set(SlashingDamage))
    else if (fixture == FireVulnerability)
      noDamageAdjustmentFacts.with("vulnerabilities", Set(FireDamage))
    else if (fixture == PoisonImmunity)
      noDamageAdjustmentFacts.with("immunities", Set(PoisonDamage))
    else if (fixture == SlashingResistanceFireVulnerability)
      noDamageAdjustmentFacts
        .with("resistances", Set(SlashingDamage))
        .with("vulnerabilities", Set(FireDamage))
    else noDamageAdjustmentFacts

  action init = all {
    qSlashing' = 0,
    qFire' = 0,
    qPoison' = 0,
    qTotal' = 0,
  }

  action recordDamageByType(amounts: DamageByType): bool = all {
    qSlashing' = damageAmountForType(amounts, SlashingDamage),
    qFire' = damageAmountForType(amounts, FireDamage),
    qPoison' = damageAmountForType(amounts, PoisonDamage),
    qTotal' = totalDamageByType(amounts),
  }

  action doAggregateAndAdjust = {
    nondet firstAmount = 0.to(12).oneOf()
    nondet secondAmount = 0.to(12).oneOf()
    nondet firstType = Set(SlashingDamage, FireDamage, PoisonDamage).oneOf()
    nondet secondType = Set(SlashingDamage, FireDamage, PoisonDamage).oneOf()
    nondet fixture = Set(
      NoAdjustments,
      SlashingResistance,
      FireVulnerability,
      PoisonImmunity,
      SlashingResistanceFireVulnerability
    ).oneOf()
    val pair = {
      firstType: firstType,
      firstAmount: firstAmount,
      secondType: secondType,
      secondAmount: secondAmount,
    }
    val adjusted =
      damageByTypeAfterTargetAdjustments(aggregateDamagePair(pair), factsForFixture(fixture))
    all {
      recordDamageByType(adjusted),
    }
  }

  action doScalarReduction = {
    nondet firstAmount = 0.to(12).oneOf()
    nondet secondAmount = 0.to(12).oneOf()
    nondet reduction = 0.to(12).oneOf()
    val pair = {
      firstType: SlashingDamage,
      firstAmount: firstAmount,
      secondType: FireDamage,
      secondAmount: secondAmount,
    }
    val reduced = damagePairAfterScalarReduction(pair, reduction)
    all {
      qSlashing' = reduced.firstAmount,
      qFire' = reduced.secondAmount,
      qPoison' = 0,
      qTotal' = pairTotal(reduced),
    }
  }

  action doDamageRollModifier = {
    nondet amount = 0.to(12).oneOf()
    nondet modifier = (-5).to(5).oneOf()
    val adjusted = adjustedDamageRollAmount(amount, modifier)
    all {
      qSlashing' = adjusted,
      qFire' = 0,
      qPoison' = 0,
      qTotal' = adjusted,
    }
  }

  // Branch budget: 13 * 13 * 3 * 3 * 5 aggregate/adjust choices +
  // 13 * 13 * 13 scalar-reduction choices + 13 * 11 modifier choices =
  // 9,935 transition choices. This proof owns only four integer vars.
  action step = any {
    doAggregateAndAdjust,
    doScalarReduction,
    doDamageRollModifier,
  }

  val invariant = all {
    qSlashing.in(0.to(24)),
    qFire.in(0.to(48)),
    qPoison.in(0.to(24)),
    qTotal.in(0.to(72)),
    legalDamageByType(qDamageByType),
    qTotal == totalDamageByType(qDamageByType),
  }
}
