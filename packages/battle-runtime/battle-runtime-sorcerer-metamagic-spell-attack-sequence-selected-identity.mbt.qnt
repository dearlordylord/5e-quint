// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSpellAttackSequenceSelectedIdentityMbt {
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

  action doResolveQuickenedSpellAttackSequence = all {
    qLastResult == "init",
    recordProjection(true, false, 2, 6, 0, "quickenedSpellAttackSequence")
  }

  action step = any {
    doResolveQuickenedSpellAttackSequence,
  }
}
