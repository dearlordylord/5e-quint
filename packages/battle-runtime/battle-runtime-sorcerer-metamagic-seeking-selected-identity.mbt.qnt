// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSeekingSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSeekingSelectedIdentityScenarioOutcome = | Init | SeekingSpellAttackReroll

  type SorcererMetamagicSeekingSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSeekingSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSeekingSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSeekingSelectedIdentityScenarioOutcome,
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

  action doResolveSeekingSpellAttackReroll = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 3, 1, SeekingSpellAttackReroll,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveSeekingSpellAttackReroll,
  }
}
