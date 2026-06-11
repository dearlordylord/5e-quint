// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicExtendedSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicExtendedSelectedIdentityWitnessState = {
    sorceryPointsRemaining: int,
    durationTicks: int,
    concentrationSavingThrowMode: str,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicExtendedSelectedIdentityWitnessState

  action recordProjection(
    sorceryPointsRemaining: int,
    durationTicks: int,
    concentrationSavingThrowMode: str,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      sorceryPointsRemaining: sorceryPointsRemaining,
      durationTicks: durationTicks,
      concentrationSavingThrowMode: concentrationSavingThrowMode,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 0, "normal", "init", witnessInit(NoHole))

  action doResolveExtendedCreatureSizeIncrease = all {
    qState.protocol.result == WInit,
    recordProjection(
      1, 20, "advantage", "extendedCreatureSizeIncrease",
      witnessResolved(NoHole),
    )
  }

  action step = any {
    doResolveExtendedCreatureSizeIncrease,
  }
}
