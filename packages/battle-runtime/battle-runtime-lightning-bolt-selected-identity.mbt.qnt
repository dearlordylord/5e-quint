// -*- mode: Bluespec; -*-

module battleRuntimeLightningBoltSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
  }

  action init = recordProjection("init")

  action doDiscoverLightningBoltSaveGatedDamage = all {
    qLastResult == "init",
    recordProjection("lightningBoltSaveGatedDamage"),
  }

  action step = any {
    doDiscoverLightningBoltSaveGatedDamage,
  }
}
