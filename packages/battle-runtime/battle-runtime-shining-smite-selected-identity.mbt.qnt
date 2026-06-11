// -*- mode: Bluespec; -*-

module battleRuntimeShiningSmiteSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type ShiningSmiteSelectedIdentityWitnessState = {
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: ShiningSmiteSelectedIdentityWitnessState

  action recordProjection(
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection("init", witnessInit(NoHole))

  action doDiscoverShiningSmiteAfterHitDamageIllumination = all {
    qState.protocol.result == WInit,
    recordProjection(
      "shiningSmiteAfterHitDamageIllumination",
      witnessResolved(NoHole),
    ),
  }

  action step = any {
    doDiscoverShiningSmiteAfterHitDamageIllumination,
  }
}
