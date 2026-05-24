// -*- mode: Bluespec; -*-

module battleRuntimeSpikeGrowthMovementHazardMbt {
  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qHazardActive: bool
  var qCasterConcentrating: bool
  var qTargetHp: int
  var qMovementSpentFeet: int
  var qHoles: Set[str]
  var qLastResult: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noHoles: Set[str] = Set()
  pure val movementDamageHoles: Set[str] = Set("MovementDamage")
  pure val damageIncrementFeet: int = 5
  pure val damageDistanceFeet: int = 10
  pure val rolledDamagePerIncrement: int = 2
  pure val damageIncrements: int = damageDistanceFeet / damageIncrementFeet
  pure val scaledDamageTotal: int = rolledDamagePerIncrement * damageIncrements
  pure val targetFullHp: int = 20
  pure val targetDamagedHp: int = targetFullHp - scaledDamageTotal
  pure val movementTotalFeet: int = 10
  pure val difficultTerrainDistanceFeet: int = damageDistanceFeet
  pure val movementCostFeet: int = movementTotalFeet + difficultTerrainDistanceFeet

  action recordSpikeGrowthState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    hazardActive: bool,
    casterConcentrating: bool,
    targetHp: int,
    movementSpentFeet: int,
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qHazardActive' = hazardActive,
    qCasterConcentrating' = casterConcentrating,
    qTargetHp' = targetHp,
    qMovementSpentFeet' = movementSpentFeet,
    qHoles' = holes,
    qLastResult' = lastResult,
  }

  action init = all {
    recordSpikeGrowthState(
      casterTurnRole,
      true,
      true,
      false,
      false,
      targetFullHp,
      0,
      noHoles,
      "init",
    ),
  }

  action doCastSpikeGrowth = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qHazardActive),
    qHoles == noHoles,
    recordSpikeGrowthState(
      casterTurnRole,
      false,
      false,
      true,
      true,
      qTargetHp,
      qMovementSpentFeet,
      noHoles,
      "cast",
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qHazardActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordSpikeGrowthState(
      targetTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      qTargetHp,
      qMovementSpentFeet,
      noHoles,
      "targetTurn",
    ),
  }

  action doDiscoverMovementDamage = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    qMovementSpentFeet == 0,
    qHoles == noHoles,
    recordSpikeGrowthState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetHp,
      0,
      movementDamageHoles,
      "needsHoles",
    ),
  }

  action doResolveMovementDamage = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    qTargetHp == targetFullHp,
    qMovementSpentFeet == 0,
    qHoles == movementDamageHoles,
    recordSpikeGrowthState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      targetDamagedHp,
      movementCostFeet,
      noHoles,
      "damaged",
    ),
  }

  action doBreakConcentration = all {
    qHazardActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordSpikeGrowthState(
      qCurrentTurnRole,
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      qTargetHp,
      qMovementSpentFeet,
      noHoles,
      "concentrationBroken",
    ),
  }

  action step = any {
    doCastSpikeGrowth,
    doEndCasterTurn,
    doDiscoverMovementDamage,
    doResolveMovementDamage,
    doBreakConcentration,
  }
}
