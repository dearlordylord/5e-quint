// -*- mode: Bluespec; -*-

module damageComponentAdjustmentsInductive {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  var qSlashing: int
  var qFire: int
  var qPoison: int
  var qTotal: int

  pure def resistedSlashingFixtureFacts: DamageAdjustmentFacts =
    noDamageAdjustmentFacts
      .with("resistances", Set(SlashingDamage))

  pure def resistedSlashingFixtureResult: DamageByType =
    damageByTypeAfterTargetAdjustments(
      addDamageAmountForType(emptyDamageByType, SlashingDamage, 5),
      resistedSlashingFixtureFacts
    )

  pure def scalarReductionFixtureResult: DamagePair =
    damagePairAfterScalarReduction({
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: FireDamage,
      secondAmount: 4,
    }, 3)

  pure def modifierFloorFixtureAmount: int =
    adjustedDamageRollAmount(0, -5)

  pure def resistedSlashingFixtureSlashing: int =
    damageAmountForType(resistedSlashingFixtureResult, SlashingDamage)
  pure def resistedSlashingFixtureFire: int =
    damageAmountForType(resistedSlashingFixtureResult, FireDamage)
  pure def resistedSlashingFixturePoison: int =
    damageAmountForType(resistedSlashingFixtureResult, PoisonDamage)
  pure def resistedSlashingFixtureTotal: int =
    resistedSlashingFixtureSlashing
      + resistedSlashingFixtureFire
      + resistedSlashingFixturePoison
  pure def scalarReductionFixtureSlashing: int =
    scalarReductionFixtureResult.firstAmount
  pure def scalarReductionFixtureFire: int =
    scalarReductionFixtureResult.secondAmount
  pure def scalarReductionFixturePoison: int = 0
  pure def scalarReductionFixtureTotal: int =
    pairTotal(scalarReductionFixtureResult)

  action init = all {
    qSlashing' = 0,
    qFire' = 0,
    qPoison' = 0,
    qTotal' = 0,
  }

  action doRecordNoDamage = all {
    qSlashing' = 0,
    qFire' = 0,
    qPoison' = 0,
    qTotal' = 0,
  }

  action doRecordResistedSlashing = all {
    qSlashing' = resistedSlashingFixtureSlashing,
    qFire' = resistedSlashingFixtureFire,
    qPoison' = resistedSlashingFixturePoison,
    qTotal' = resistedSlashingFixtureTotal,
  }

  action doRecordScalarReduction = all {
    qSlashing' = scalarReductionFixtureSlashing,
    qFire' = scalarReductionFixtureFire,
    qPoison' = scalarReductionFixturePoison,
    qTotal' = scalarReductionFixtureTotal,
  }

  action doRecordModifierFloor = all {
    qSlashing' = modifierFloorFixtureAmount,
    qFire' = 0,
    qPoison' = 0,
    qTotal' = modifierFloorFixtureAmount,
  }

  // Branch budget: three fixed reducer-derived fixtures plus an explicit
  // no-damage baseline.
  action step = any {
    doRecordNoDamage,
    doRecordResistedSlashing,
    doRecordScalarReduction,
    doRecordModifierFloor,
  }

  val invariant = all {
    qSlashing.in(0.to(24)),
    qFire.in(0.to(48)),
    qPoison.in(0.to(24)),
    qTotal.in(0.to(72)),
    qTotal == qSlashing + qFire + qPoison,
  }
}
