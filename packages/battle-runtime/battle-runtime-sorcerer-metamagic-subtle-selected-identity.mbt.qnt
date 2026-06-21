// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSubtleSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSubtleSelectedIdentityScenarioOutcome = | Init | SubtleFalseLife | UnaffordableSubtleFalseLife

  type SorcererMetamagicSubtleSelectedIdentityWitnessState = {
    verbalSuppressed: bool,
    somaticSuppressed: bool,
    materialSuppressed: bool,
    materialPreserved: bool,
    sorceryPointsRemaining: int,
    tempHp: int,
    scenarioOutcome: SorcererMetamagicSubtleSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSubtleSelectedIdentityWitnessState

  action recordProjection(
    verbalSuppressed: bool,
    somaticSuppressed: bool,
    materialSuppressed: bool,
    materialPreserved: bool,
    sorceryPointsRemaining: int,
    tempHp: int,
    scenarioOutcome: SorcererMetamagicSubtleSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      verbalSuppressed: verbalSuppressed,
      somaticSuppressed: somaticSuppressed,
      materialSuppressed: materialSuppressed,
      materialPreserved: materialPreserved,
      sorceryPointsRemaining: sorceryPointsRemaining,
      tempHp: tempHp,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init =
    recordProjection(false, false, false, false, 2, 0, Init, witnessInit(NoHole))

  action doResolveSubtleFalseLife = all {
    qState.protocol.result == WInit,
    recordProjection(
      true,
      true,
      true,
      false,
      1,
      11,
      SubtleFalseLife,
      witnessResolved(NoHole))
  }

  action doRejectSubtleFalseLifeWithoutSorceryPoints = all {
    qState.protocol.result == WInit,
    recordProjection(
      false,
      false,
      false,
      false,
      0,
      0,
      UnaffordableSubtleFalseLife,
      witnessInvalid(NoHole, WUnsupportedActOption))
  }

  action step = any {
    doResolveSubtleFalseLife,
    doRejectSubtleFalseLifeWithoutSorceryPoints,
  }
}
