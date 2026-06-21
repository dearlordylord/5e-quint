// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSpellAttackSequenceSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSpellAttackSequenceSelectedIdentityScenarioOutcome = | Init | QuickenedSpellAttackSequence

  type SorcererMetamagicSpellAttackSequenceSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSpellAttackSequenceSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSpellAttackSequenceSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSpellAttackSequenceSelectedIdentityScenarioOutcome,
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

  action doResolveQuickenedSpellAttackSequence = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, false, 2, 6, 0, QuickenedSpellAttackSequence,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveQuickenedSpellAttackSequence,
  }
}
