// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicExtendedSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicExtendedSelectedIdentityScenarioOutcome = | Init | ExtendedCreatureSizeIncrease

  type SorcererMetamagicExtendedSelectedIdentityWitnessState = {
    sorceryPointsRemaining: int,
    durationTicks: int,
    concentrationSavingThrowMode: str,
    scenarioOutcome: SorcererMetamagicExtendedSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicExtendedSelectedIdentityWitnessState

  action recordProjection(
    sorceryPointsRemaining: int,
    durationTicks: int,
    concentrationSavingThrowMode: str,
    scenarioOutcome: SorcererMetamagicExtendedSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      sorceryPointsRemaining: sorceryPointsRemaining,
      durationTicks: durationTicks,
      concentrationSavingThrowMode: concentrationSavingThrowMode,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 0, "normal", Init, witnessInit(NoHole))

  action doResolveExtendedCreatureSizeIncrease = all {
    qState.protocol.result == WInit,
    recordProjection(
      1, 20, "advantage", ExtendedCreatureSizeIncrease,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveExtendedCreatureSizeIncrease,
  }
}
