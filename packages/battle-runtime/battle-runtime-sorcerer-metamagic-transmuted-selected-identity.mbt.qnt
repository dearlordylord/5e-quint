// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicTransmutedSelectedIdentityMbt {
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

  action doResolveTransmutedSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection(false, true, 3, 1, 0, "transmutedSaveGatedDamage")
  }

  action doResolveTransmutedSpellAttack = all {
    qLastResult == "init",
    recordProjection(false, true, 3, 3, 1, "transmutedSpellAttack")
  }

  action step = any {
    doResolveTransmutedSaveGatedDamage,
    doResolveTransmutedSpellAttack,
  }
}
