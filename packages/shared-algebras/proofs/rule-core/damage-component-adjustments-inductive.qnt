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

  pure def qDamageByType: DamageByType = {
    acid: 0,
    bludgeoning: 0,
    cold: 0,
    fire: qFire,
    force: 0,
    lightning: 0,
    necrotic: 0,
    piercing: 0,
    poison: qPoison,
    psychic: 0,
    radiant: 0,
    slashing: qSlashing,
    thunder: 0,
  }

  pure def factsForFixture(fixture: AdjustmentFixture): DamageAdjustmentFacts =
    if (fixture == SlashingResistance)
      noDamageAdjustmentFacts.with("resistantSlashing", true)
    else if (fixture == FireVulnerability)
      noDamageAdjustmentFacts.with("vulnerableFire", true)
    else if (fixture == PoisonImmunity)
      noDamageAdjustmentFacts.with("immunePoison", true)
    else if (fixture == SlashingResistanceFireVulnerability)
      noDamageAdjustmentFacts
        .with("resistantSlashing", true)
        .with("vulnerableFire", true)
    else noDamageAdjustmentFacts

  action init = all {
    qSlashing' = 0,
    qFire' = 0,
    qPoison' = 0,
    qTotal' = 0,
  }

  action recordDamageByType(amounts: DamageByType): bool = all {
    qSlashing' = amounts.slashing,
    qFire' = amounts.fire,
    qPoison' = amounts.poison,
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
