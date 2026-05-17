// -*- mode: Bluespec; -*-

module bardicInspirationSelectedIdentityMbt {
  import battleRuntime.* from "./battle-runtime"

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

  action doGrantBardicInspirationD12 = {
    val granted = bardicInspirationTargetEffectsAfterGrant(Set(), Fighter, 15)
    all {
      qTargetBardicInspirationDieSize == 0,
      recordProjection(
        false,
        0,
        if (granted.contains(BardicInspirationDie({ source: Fighter, dieSize: 12, durationTicks: 600 }))) 12 else 0,
        "resolved"
      ),
    }
  }

  action step = any {
    doGrantBardicInspirationD12,
  }
}
