// -*- mode: Bluespec; -*-

module battleRuntimeHealingStabilizationSelectedIdentityMbt {
  var qTargetHp: int
  var qTargetStable: bool
  var qTargetUnconscious: bool
  var qTargetDeathSuccesses: int
  var qTargetDeathFailures: int
  var qActionAvailable: bool
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    targetStable: bool,
    targetUnconscious: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    actionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qTargetStable' = targetStable,
    qTargetUnconscious' = targetUnconscious,
    qTargetDeathSuccesses' = targetDeathSuccesses,
    qTargetDeathFailures' = targetDeathFailures,
    qActionAvailable' = actionAvailable,
    qLastResult' = lastResult,
  }

  action init = recordProjection(0, false, true, 2, 1, true, "init")

  action doResolveSpareTheDyingStable = all {
    qLastResult == "init",
    recordProjection(0, true, true, 0, 0, false, "resolved"),
  }

  action step = any {
    doResolveSpareTheDyingStable,
  }
}
