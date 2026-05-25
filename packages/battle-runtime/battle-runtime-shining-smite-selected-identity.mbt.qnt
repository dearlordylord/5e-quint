// -*- mode: Bluespec; -*-

module battleRuntimeShiningSmiteSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
  }

  action init = recordProjection("init")

  action doDiscoverShiningSmiteAfterHitDamageIllumination = all {
    qLastResult == "init",
    recordProjection("shiningSmiteAfterHitDamageIllumination"),
  }

  action step = any {
    doDiscoverShiningSmiteAfterHitDamageIllumination,
  }
}
