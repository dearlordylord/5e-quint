// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicTransmutedSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicTransmutedSelectedIdentityScenarioOutcome = | Init | TransmutedSaveGatedDamage | TransmutedSpellAttack

  type SorcererMetamagicTransmutedSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicTransmutedSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicTransmutedSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicTransmutedSelectedIdentityScenarioOutcome,
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

  action doResolveTransmutedSaveGatedDamage = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 1, 0, TransmutedSaveGatedDamage,
      witnessResolved(NoHole))
  }

  action doResolveTransmutedSpellAttack = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 3, 3, 1, TransmutedSpellAttack,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveTransmutedSaveGatedDamage,
    doResolveTransmutedSpellAttack,
  }
}
