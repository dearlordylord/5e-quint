// -*- mode: Bluespec; -*-

module battleRuntimeSpikeGrowthMovementHazardMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = str

  type SpikeGrowthMovementHazardScenarioOutcome = | Init | Cast | TargetTurn | NeedsHoles | Damaged | ConcentrationBroken


  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qHazardActive: bool
  var qCasterConcentrating: bool
  var qTargetHp: int
  var qMovementSpentFeet: int
  var qProtocol: WitnessProtocol[Hole]
  var qScenarioOutcome: SpikeGrowthMovementHazardScenarioOutcome

  pure def qHoles: Set[Hole] = qProtocol.holes
  pure def qLastResult: SpikeGrowthMovementHazardScenarioOutcome = qScenarioOutcome

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

  pure def spikeGrowthProtocolForProjection(
    holes: Set[Hole],
    scenarioResult: SpikeGrowthMovementHazardScenarioOutcome,
  ): WitnessProtocol[Hole] =
    if (scenarioResult == Init) witnessInit("MovementDamage")
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("MovementDamage")

  action recordSpikeGrowthState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    hazardActive: bool,
    casterConcentrating: bool,
    targetHp: int,
    movementSpentFeet: int,
    holes: Set[str],
    lastResult: SpikeGrowthMovementHazardScenarioOutcome,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qHazardActive' = hazardActive,
    qCasterConcentrating' = casterConcentrating,
    qTargetHp' = targetHp,
    qMovementSpentFeet' = movementSpentFeet,
    qProtocol' = spikeGrowthProtocolForProjection(holes, lastResult),
    qScenarioOutcome' = lastResult,
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
      Init,
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
      Cast,
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
      TargetTurn,
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
      NeedsHoles,
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
      Damaged,
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
      ConcentrationBroken,
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
