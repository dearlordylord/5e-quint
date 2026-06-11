// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicEmpoweredSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicEmpoweredSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicEmpoweredSelectedIdentityWitnessState

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

  action doResolveEmpoweredSpellDamageReroll = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 1, 1, "empoweredSpellDamageReroll",
      witnessResolved(NoHole),
    )
  }

  action step = any {
    doResolveEmpoweredSpellDamageReroll,
  }
}
