// -*- mode: Bluespec; -*-

module battleRuntimeFireballSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
  }

  action init = recordProjection("init")

  action doDiscoverFireballSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection("fireballSaveGatedDamage"),
  }

  action step = any {
    doDiscoverFireballSaveGatedDamage,
  }
}
