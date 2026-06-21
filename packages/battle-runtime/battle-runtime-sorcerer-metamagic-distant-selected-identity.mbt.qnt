// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicDistantSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicDistantSelectedIdentityScenarioOutcome = | Init | DistantObjectLight

  type SorcererMetamagicDistantSelectedIdentityWitnessState = {
    sorceryPointsRemaining: int,
    lightEmitterCount: int,
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
    scenarioOutcome: SorcererMetamagicDistantSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicDistantSelectedIdentityWitnessState

  action recordProjection(
    sorceryPointsRemaining: int,
    lightEmitterCount: int,
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
    scenarioOutcome: SorcererMetamagicDistantSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      sorceryPointsRemaining: sorceryPointsRemaining,
      lightEmitterCount: lightEmitterCount,
      brightRadiusFeet: brightRadiusFeet,
      dimAdditionalFeet: dimAdditionalFeet,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 0, 0, 0, Init, witnessInit(NoHole))

  action doResolveDistantObjectLight = all {
    qState.protocol.result == WInit,
    recordProjection(1, 1, 20, 20, DistantObjectLight, witnessResolved(NoHole))
  }

  action step = any {
    doResolveDistantObjectLight,
  }
}
