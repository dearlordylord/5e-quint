// -*- mode: Bluespec; -*-

module battleRuntimeMyceliumStepFeatureSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MyceliumStepFeatureSelectedIdentityScenarioOutcome = | Init | Discovered | Dashed


  type MyceliumStepFeatureSelectedIdentityWitnessState = {
    qBonusActionAvailable: bool,
    qDashBonusFeet: int,
    qScenarioOutcome: MyceliumStepFeatureSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MyceliumStepFeatureSelectedIdentityWitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qDashBonusFeet: int = qState.qDashBonusFeet
  pure def scenarioOutcome: MyceliumStepFeatureSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: MyceliumStepFeatureSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    lastResult: MyceliumStepFeatureSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qDashBonusFeet: dashBonusFeet,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(
    true,
    0,
    Init,
  )

  action doDiscoverMyceliumStepDash = all {
    scenarioOutcome == Init,
    recordProjection(
      true,
      0,
      Discovered,
    ),
  }

  action doDashAsBonusAction = all {
    scenarioOutcome == Init,
    recordProjection(
      false,
      30,
      Dashed,
    ),
  }

  action step = any {
    doDiscoverMyceliumStepDash,
    doDashAsBonusAction,
  }
}
