// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSelectedIdentityScenarioOutcome = | Init | QuickenedSaveGatedDamage

  type SorcererMetamagicSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      magicActionAvailable: magicActionAvailable,
      bonusActionAvailable: bonusActionAvailable,
      sorceryPointsRemaining: sorceryPointsRemaining,
      targetHp: targetHp,
      targetActiveEffectCount: targetActiveEffectCount,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(true, true, 4, 10, 0, Init, witnessInit(NoHole))

  action doResolveQuickenedSaveGatedDamage = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, false, 2, 1, 0, QuickenedSaveGatedDamage,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveQuickenedSaveGatedDamage,
  }
}
