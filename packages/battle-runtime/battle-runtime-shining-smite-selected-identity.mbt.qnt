// -*- mode: Bluespec; -*-

module battleRuntimeShiningSmiteSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type ShiningSmiteSelectedIdentityScenarioOutcome = | Init | ShiningSmiteAfterHitDamageIllumination

  type ShiningSmiteSelectedIdentityWitnessState = {
    scenarioOutcome: ShiningSmiteSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: ShiningSmiteSelectedIdentityWitnessState

  action recordProjection(
    scenarioOutcome: ShiningSmiteSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(Init, witnessInit(NoHole))

  action doDiscoverShiningSmiteAfterHitDamageIllumination = all {
    qState.protocol.result == WInit,
    recordProjection(
      ShiningSmiteAfterHitDamageIllumination,
      witnessResolved(NoHole)),
  }

  action step = any {
    doDiscoverShiningSmiteAfterHitDamageIllumination,
  }
}
