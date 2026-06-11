// -*- mode: Bluespec; -*-

module battleRuntimeMyceliumStepFeatureSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MyceliumStepFeatureSelectedIdentityWitnessState = {
    qBonusActionAvailable: bool,
    qDashBonusFeet: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MyceliumStepFeatureSelectedIdentityWitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qDashBonusFeet: int = qState.qDashBonusFeet
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qDashBonusFeet: dashBonusFeet,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(
    true,
    0,
    "init",
  )

  action doDiscoverMyceliumStepDash = all {
    qLastResult == "init",
    recordProjection(
      true,
      0,
      "discovered",
    ),
  }

  action doDashAsBonusAction = all {
    qLastResult == "init",
    recordProjection(
      false,
      30,
      "dashed",
    ),
  }

  action step = any {
    doDiscoverMyceliumStepDash,
    doDashAsBonusAction,
  }
}
