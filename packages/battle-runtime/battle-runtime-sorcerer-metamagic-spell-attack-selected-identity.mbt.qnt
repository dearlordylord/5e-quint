// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSpellAttackSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicSpellAttackSelectedIdentityScenarioOutcome = | Init | QuickenedSpellAttack

  type SorcererMetamagicSpellAttackSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSpellAttackSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicSpellAttackSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicSpellAttackSelectedIdentityScenarioOutcome,
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

  action doResolveQuickenedSpellAttack = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, false, 2, 3, 1, QuickenedSpellAttack,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveQuickenedSpellAttack,
  }
}
