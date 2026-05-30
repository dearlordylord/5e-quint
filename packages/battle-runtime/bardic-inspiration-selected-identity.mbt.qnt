// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts that granting Bardic
// Inspiration to a fifth-level Bard yields a d12 Bardic Inspiration die, instead
// of importing the feature reducer to recompute it. Keeps the import closure
// empty so MBT trace generation stays fast (see scripts/check-mbt-driver-closure.cjs).
module bardicInspirationSelectedIdentityMbt {
  var qBonusActionAvailable: bool
  var qFeatureUsesRemaining: int
  var qTargetBardicInspirationDieSize: int
  var qLastResult: str

  action recordProjection(
    bonusActionAvailable: bool,
    featureUsesRemaining: int,
    targetBardicInspirationDieSize: int,
    result: str,
  ): bool = all {
    qBonusActionAvailable' = bonusActionAvailable,
    qFeatureUsesRemaining' = featureUsesRemaining,
    qTargetBardicInspirationDieSize' = targetBardicInspirationDieSize,
    qLastResult' = result,
  }

  action init = recordProjection(true, 1, 0, "init")

  // Granting Bardic Inspiration spends the Bonus Action and one use, and installs
  // a d12 die on the target (the fifth-level Bard's Bardic Inspiration die).
  action doGrantBardicInspirationD12 = all {
    qTargetBardicInspirationDieSize == 0,
    recordProjection(false, 0, 12, "resolved"),
  }

  action step = any {
    doGrantBardicInspirationD12,
  }
}
