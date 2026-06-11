// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicHeightenedSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SorcererMetamagicHeightenedSelectedIdentityWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SorcererMetamagicHeightenedSelectedIdentityWitnessState

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

  action doResolveHeightenedSaveGatedDamage = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 2, 1, 0, "heightenedSaveGatedDamage",
      witnessResolved(NoHole),
    )
  }

  action doResolveHeightenedHideousLaughter = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, true, 2, 10, 1, "heightenedHideousLaughter",
      witnessResolved(NoHole),
    )
  }

  action doResolveHeightenedGreaseEntrySave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, "heightenedGreaseEntrySave",
      witnessResolved(NoHole),
    )
  }

  action doResolveHeightenedGustOfWindEndTurnSave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, "heightenedGustOfWindEndTurnSave",
      witnessResolved(NoHole),
    )
  }

  action doResolveHeightenedSaveGatedConditionEndTurnSave = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, true, 2, 10, 0, "heightenedSaveGatedConditionEndTurnSave",
      witnessResolved(NoHole),
    )
  }

  action step = any {
    doResolveHeightenedSaveGatedDamage,
    doResolveHeightenedHideousLaughter,
    doResolveHeightenedGreaseEntrySave,
    doResolveHeightenedGustOfWindEndTurnSave,
    doResolveHeightenedSaveGatedConditionEndTurnSave,
  }
}
