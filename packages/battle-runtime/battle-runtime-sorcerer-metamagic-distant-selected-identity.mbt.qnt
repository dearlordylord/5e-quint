// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicDistantSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicDistantSelectedIdentityWitnessState = {
    sorceryPointsRemaining: int,
    lightEmitterCount: int,
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicDistantSelectedIdentityWitnessState

  action recordProjection(
    sorceryPointsRemaining: int,
    lightEmitterCount: int,
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      sorceryPointsRemaining: sorceryPointsRemaining,
      lightEmitterCount: lightEmitterCount,
      brightRadiusFeet: brightRadiusFeet,
      dimAdditionalFeet: dimAdditionalFeet,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 0, 0, 0, "init", witnessInit(NoHole))

  action doResolveDistantObjectLight = all {
    qState.protocol.result == WInit,
    recordProjection(1, 1, 20, 20, "distantObjectLight", witnessResolved(NoHole))
  }

  action step = any {
    doResolveDistantObjectLight,
  }
}
