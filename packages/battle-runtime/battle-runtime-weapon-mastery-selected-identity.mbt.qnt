// -*- mode: Bluespec; -*-

module battleRuntimeWeaponMasterySelectedIdentityMbt {
  var qPrimaryTargetHp: int
  var qSecondTargetHp: int
  var qActionAvailable: bool
  var qPrimaryTargetHasSapEffect: bool
  var qPrimaryTargetProne: bool
  var qCleaveUsed: bool
  var qLastResult: str

  action recordProjection(
    primaryTargetHp: int,
    secondTargetHp: int,
    actionAvailable: bool,
    primaryTargetHasSapEffect: bool,
    primaryTargetProne: bool,
    cleaveUsed: bool,
    lastResult: str,
  ): bool = all {
    qPrimaryTargetHp' = primaryTargetHp,
    qSecondTargetHp' = secondTargetHp,
    qActionAvailable' = actionAvailable,
    qPrimaryTargetHasSapEffect' = primaryTargetHasSapEffect,
    qPrimaryTargetProne' = primaryTargetProne,
    qCleaveUsed' = cleaveUsed,
    qLastResult' = lastResult,
  }

  action init = recordProjection(13, 13, true, false, false, false, "init")

  action doResolveSapMasteryPropertyHit = all {
    qLastResult == "init",
    recordProjection(9, 13, false, true, false, false, "resolved"),
  }

  action doResolveToppleMasteryPropertyFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(13, 13, true, false, true, false, "needsHoles"),
  }

  action doResolveCleaveMasteryPropertySecondTargetHit = all {
    qLastResult == "init",
    recordProjection(9, 9, false, false, false, true, "resolved"),
  }

  action step = any {
    doResolveSapMasteryPropertyHit,
    doResolveToppleMasteryPropertyFailedSavingThrow,
    doResolveCleaveMasteryPropertySecondTargetHit,
  }
}
