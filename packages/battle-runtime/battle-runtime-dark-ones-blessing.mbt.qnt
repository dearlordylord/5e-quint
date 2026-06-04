// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.enemy-zero-hit-point-temporary-hit-points

module battleRuntimeDarkOnesBlessingMbt {
  var qWarlockTempHp: int
  var qTargetHp: int
  var qLastResult: str

  action recordProjection(
    warlockTempHp: int,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qWarlockTempHp' = warlockTempHp,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(0, 5, "init")

  action doSelfKill = all {
    qLastResult == "init",
    recordProjection(6, 0, "selfKill"),
  }

  action doNearbyOtherKill = all {
    qLastResult == "init",
    recordProjection(6, 0, "nearbyOtherKill"),
  }

  action doSameSideOtherKill = all {
    qLastResult == "init",
    recordProjection(6, 0, "sameSideOtherKill"),
  }

  action doRejectOutOfRangeOtherKill = all {
    qLastResult == "init",
    recordProjection(0, 0, "outOfRangeRejected"),
  }

  action doRejectNonEnemyKill = all {
    qLastResult == "init",
    recordProjection(0, 0, "nonEnemyRejected"),
  }

  action doMinimumTemporaryHitPoints = all {
    qLastResult == "init",
    recordProjection(1, 0, "minimumTemporaryHitPoints"),
  }

  action doTemporaryHitPointReplacement = all {
    qLastResult == "init",
    recordProjection(8, 0, "temporaryHitPointReplacement"),
  }

  action step = any {
    doSelfKill,
    doNearbyOtherKill,
    doSameSideOtherKill,
    doRejectOutOfRangeOtherKill,
    doRejectNonEnemyKill,
    doMinimumTemporaryHitPoints,
    doTemporaryHitPointReplacement,
  }
}
