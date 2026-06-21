// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicHeightenedSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicHeightenedSelectedIdentityScenarioOutcome = | Init | HeightenedSaveGatedDamage | HeightenedHideousLaughter | HeightenedGreaseEntrySave | HeightenedGustOfWindEndTurnSave | HeightenedSaveGatedConditionEndTurnSave

  type SorcererMetamagicHeightenedSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicHeightenedSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicHeightenedSelectedIdentityWitnessState

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioOutcome: SorcererMetamagicHeightenedSelectedIdentityScenarioOutcome,
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

  action doResolveHeightenedSaveGatedDamage = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 2, 1, 0, HeightenedSaveGatedDamage,
      witnessResolved(NoHole))
  }

  action doResolveHeightenedHideousLaughter = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 2, 10, 1, HeightenedHideousLaughter,
      witnessResolved(NoHole))
  }

  action doResolveHeightenedGreaseEntrySave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, HeightenedGreaseEntrySave,
      witnessResolved(NoHole))
  }

  action doResolveHeightenedGustOfWindEndTurnSave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, HeightenedGustOfWindEndTurnSave,
      witnessResolved(NoHole))
  }

  action doResolveHeightenedSaveGatedConditionEndTurnSave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, HeightenedSaveGatedConditionEndTurnSave,
      witnessResolved(NoHole))
  }

  action step = any {
    doResolveHeightenedSaveGatedDamage,
    doResolveHeightenedHideousLaughter,
    doResolveHeightenedGreaseEntrySave,
    doResolveHeightenedGustOfWindEndTurnSave,
    doResolveHeightenedSaveGatedConditionEndTurnSave,
  }
}
