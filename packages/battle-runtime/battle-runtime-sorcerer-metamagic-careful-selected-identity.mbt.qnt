// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicCarefulSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicCarefulSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicCarefulSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      magicActionAvailable: magicActionAvailable,
      bonusActionAvailable: bonusActionAvailable,
      sorceryPointsRemaining: sorceryPointsRemaining,
      targetHp: targetHp,
      targetActiveEffectCount: targetActiveEffectCount,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(true, true, 4, 10, 0, "init", witnessInit(NoHole))

  action doResolveCarefulSaveGatedDamage = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 10, 0, "carefulSaveGatedDamage",
      witnessResolved(NoHole),
    )
  }

  action doResolveCarefulSaveGatedNoEffect = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 10, 0, "carefulSaveGatedNoEffect",
      witnessResolved(NoHole),
    )
  }

  action step = any {
    doResolveCarefulSaveGatedDamage,
    doResolveCarefulSaveGatedNoEffect,
  }
}
