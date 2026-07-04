// -*- mode: Bluespec; -*-

module damageComponentAdjustmentsInductive {
  var qSlashing: int
  var qFire: int
  var qPoison: int
  var qTotal: int

  pure def resistedSlashingFixtureSlashing: int = 2
  pure def resistedSlashingFixtureFire: int = 0
  pure def resistedSlashingFixturePoison: int = 0
  pure def resistedSlashingFixtureTotal: int =
    resistedSlashingFixtureSlashing
      + resistedSlashingFixtureFire
      + resistedSlashingFixturePoison
  pure def scalarReductionFixtureSlashing: int = 3
  pure def scalarReductionFixtureFire: int = 3
  pure def scalarReductionFixturePoison: int = 0
  pure def scalarReductionFixtureTotal: int =
    scalarReductionFixtureSlashing
      + scalarReductionFixtureFire
      + scalarReductionFixturePoison
  pure def modifierFloorFixtureAmount: int = 0

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

  // Branch budget: three fixed fixture totals checked by the companion
  // run-block tests plus an explicit no-damage baseline.
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
