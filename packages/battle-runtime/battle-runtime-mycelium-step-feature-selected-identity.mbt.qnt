// -*- mode: Bluespec; -*-

module battleRuntimeMyceliumStepFeatureSelectedIdentityMbt {
  var qBonusActionAvailable: bool
  var qDashBonusFeet: int
  var qLastResult: str

  action recordProjection(
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    lastResult: str,
  ): bool = all {
    qBonusActionAvailable' = bonusActionAvailable,
    qDashBonusFeet' = dashBonusFeet,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    true,
    0,
    "init",
  )

  action doDiscoverMyceliumStepDash = all {
    qLastResult == "init",
    recordProjection(
      true,
      0,
      "discovered",
    ),
  }

  action doDashAsBonusAction = all {
    qLastResult == "init",
    recordProjection(
      false,
      30,
      "dashed",
    ),
  }

  action step = any {
    doDiscoverMyceliumStepDash,
    doDashAsBonusAction,
  }
}
