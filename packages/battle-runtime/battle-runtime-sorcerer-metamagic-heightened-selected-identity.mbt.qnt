// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicHeightenedSelectedIdentityMbt {
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qSorceryPointsRemaining: int
  var qTargetHp: int
  var qTargetActiveEffectCount: int
  var qLastResult: str

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    targetActiveEffectCount: int,
    lastResult: str,
  ): bool = all {
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qSorceryPointsRemaining' = sorceryPointsRemaining,
    qTargetHp' = targetHp,
    qTargetActiveEffectCount' = targetActiveEffectCount,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, true, 4, 10, 0, "init")

  action doResolveHeightenedSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection(false, true, 2, 1, 0, "heightenedSaveGatedDamage")
  }

  action doResolveHeightenedHideousLaughter = all {
    qLastResult == "init",
    recordProjection(false, true, 2, 10, 1, "heightenedHideousLaughter")
  }

  action doResolveHeightenedGreaseEntrySave = all {
    qLastResult == "init",
    recordProjection(true, true, 2, 10, 0, "heightenedGreaseEntrySave")
  }

  action step = any {
    doResolveHeightenedSaveGatedDamage,
    doResolveHeightenedHideousLaughter,
    doResolveHeightenedGreaseEntrySave,
  }
}
