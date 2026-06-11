// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSpellAttackSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSpellAttackSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSpellAttackSelectedIdentityWitnessState

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

  action doResolveQuickenedSpellAttack = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, false, 2, 3, 1, "quickenedSpellAttack",
      witnessResolved(NoHole),
    )
  }

  action step = any {
    doResolveQuickenedSpellAttack,
  }
}
