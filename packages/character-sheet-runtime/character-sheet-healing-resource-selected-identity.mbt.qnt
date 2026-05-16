// -*- mode: Bluespec; -*-

module characterSheetHealingResourceSelectedIdentityMbt {
  var qSourceHp: int
  var qTargetHp: int
  var qTargetPoisoned: bool
  var qPoolExpended: int
  var qPoolRemaining: int
  var qLastResult: str

  action recordProjection(
    sourceHp: int,
    targetHp: int,
    targetPoisoned: bool,
    poolExpended: int,
    poolRemaining: int,
    lastResult: str,
  ): bool = all {
    qSourceHp' = sourceHp,
    qTargetHp' = targetHp,
    qTargetPoisoned' = targetPoisoned,
    qPoolExpended' = poolExpended,
    qPoolRemaining' = poolRemaining,
    qLastResult' = lastResult,
  }

  action init = recordProjection(12, 3, true, 0, 10, "init")

  action doLayOnHandsRestoreHpAndRemovePoisoned = all {
    qLastResult == "init",
    recordProjection(12, 5, false, 7, 3, "resolved"),
  }

  action step = any {
    doLayOnHandsRestoreHpAndRemovePoisoned,
  }
}
