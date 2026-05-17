// -*- mode: Bluespec; -*-

module battleRuntimeBeamSequenceSelectedIdentityMbt {
  var qInitialCreatureTargetHoles: int
  var qInitialObjectTargetHoles: int
  var qSkeletonHp: int
  var qZombieHp: int
  var qObjectHp: int
  var qActionAvailable: bool
  var qLastResult: str

  action recordProjection(
    initialCreatureTargetHoles: int,
    initialObjectTargetHoles: int,
    skeletonHp: int,
    zombieHp: int,
    objectHp: int,
    actionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qInitialCreatureTargetHoles' = initialCreatureTargetHoles,
    qInitialObjectTargetHoles' = initialObjectTargetHoles,
    qSkeletonHp' = skeletonHp,
    qZombieHp' = zombieHp,
    qObjectHp' = objectHp,
    qActionAvailable' = actionAvailable,
    qLastResult' = lastResult,
  }

  action init = recordProjection(2, 2, 13, 11, 5, true, "init")

  action doDiscoverLevelFiveBeamTargetHoles = all {
    qLastResult == "init",
    recordProjection(2, 2, 13, 11, 5, true, "discovered"),
  }

  action doResolveTwoCreatureBeamsSameTarget = all {
    qLastResult == "init",
    recordProjection(2, 2, 9, 11, 5, false, "sameTargetResolved"),
  }

  action doResolveTwoCreatureBeamsSplitTargets = all {
    qLastResult == "init",
    recordProjection(2, 2, 9, 7, 5, false, "splitTargetResolved"),
  }

  action doResolveCreatureAndObjectBeamTargets = all {
    qLastResult == "init",
    recordProjection(2, 2, 9, 11, 1, false, "creatureObjectResolved"),
  }

  action step = any {
    doDiscoverLevelFiveBeamTargetHoles,
    doResolveTwoCreatureBeamsSameTarget,
    doResolveTwoCreatureBeamsSplitTargets,
    doResolveCreatureAndObjectBeamTargets,
  }
}
