// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSubtleSelectedIdentity {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSubtleSelectedIdentityWitnessState = {
    verbalSuppressed: bool,
    somaticSuppressed: bool,
    materialSuppressed: bool,
    materialPreserved: bool,
    sorceryPointsRemaining: int,
    tempHp: int,
    scenarioResult: str,
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
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      verbalSuppressed: verbalSuppressed,
      somaticSuppressed: somaticSuppressed,
      materialSuppressed: materialSuppressed,
      materialPreserved: materialPreserved,
      sorceryPointsRemaining: sorceryPointsRemaining,
      tempHp: tempHp,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init =
    recordProjection(false, false, false, false, 2, 0, "init", witnessInit(NoHole))

  action doResolveSubtleFalseLife = all {
    qState.protocol.result == WInit,
    recordProjection(
      true,
      true,
      true,
      false,
      1,
      11,
      "subtleFalseLife",
      witnessResolved(NoHole),
    )
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
      "unaffordableSubtleFalseLife",
      witnessInvalid(NoHole, WUnsupportedActOption),
    )
  }

  action step = any {
    doResolveSubtleFalseLife,
    doRejectSubtleFalseLifeWithoutSorceryPoints,
  }
}
