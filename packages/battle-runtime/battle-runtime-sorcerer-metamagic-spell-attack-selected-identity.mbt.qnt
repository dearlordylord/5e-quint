// -*- mode: Bluespec; -*-

module battleRuntimeSorcererMetamagicSpellAttackSelectedIdentityMbt {
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qSorceryPointsRemaining: int
  var qTargetHp: int
  var qLastResult: str

  action recordProjection(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qSorceryPointsRemaining' = sorceryPointsRemaining,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, true, 4, 10, "init")

  action doResolveQuickenedSpellAttack = all {
    qLastResult == "init",
    recordProjection(true, false, 2, 3, "quickenedSpellAttack")
  }

  action step = any {
    doResolveQuickenedSpellAttack,
  }
}
