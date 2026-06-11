// -*- mode: Bluespec; -*-

module battleRuntimeDangerSenseSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DangerSense

  type DangerSenseSelectedIdentityScenarioOutcome = | Init | DangerSenseDexterityAdvantage | DangerSenseIncapacitatedSuppressed


  type WitnessState = {
    qScenarioOutcome: DangerSenseSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
    qSourceUnitId: str,
    qDexterityRollModeCount: int,
    qConstitutionRollModeCount: int,
    qSuppressed: bool,
    qAccepted: bool,
  }

  var qState: WitnessState

  pure def qScenarioOutcome: DangerSenseSelectedIdentityScenarioOutcome = qState.qScenarioOutcome
  pure def qSourceUnitId: str = qState.qSourceUnitId
  pure def qDexterityRollModeCount: int = qState.qDexterityRollModeCount
  pure def qConstitutionRollModeCount: int = qState.qConstitutionRollModeCount
  pure def qSuppressed: bool = qState.qSuppressed
  pure def qAccepted: bool = qState.qAccepted


  action recordProjection(
    scenarioOutcome: DangerSenseSelectedIdentityScenarioOutcome,
    sourceUnitId: str,
    dexterityRollModeCount: int,
    constitutionRollModeCount: int,
    suppressed: bool,
    accepted: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
      qSourceUnitId: sourceUnitId,
      qDexterityRollModeCount: dexterityRollModeCount,
      qConstitutionRollModeCount: constitutionRollModeCount,
      qSuppressed: suppressed,
      qAccepted: accepted,
    },
  }

  action init =
    recordProjection(
      Init,
      "none",
      0,
      0,
      false,
      false,
      witnessInit(DangerSense),
    )

  action doProjectDangerSenseDexterityAdvantage = all {
    qScenarioOutcome == Init,
    recordProjection(
      DangerSenseDexterityAdvantage,
      "barbarian_danger_sense",
      1,
      0,
      false,
      true,
      witnessResolved(DangerSense),
    ),
  }

  action doSuppressDangerSenseWhileIncapacitated = all {
    qScenarioOutcome == Init,
    recordProjection(
      DangerSenseIncapacitatedSuppressed,
      "barbarian_danger_sense",
      0,
      0,
      true,
      true,
      witnessResolved(DangerSense),
    ),
  }

  action step = any {
    doProjectDangerSenseDexterityAdvantage,
    doSuppressDangerSenseWhileIncapacitated,
  }
}
