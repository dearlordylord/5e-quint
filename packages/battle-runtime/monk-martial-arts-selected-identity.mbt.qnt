// -*- mode: Bluespec; -*-

module monkMartialArtsSelectedIdentityMbt {
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import unitFeatureProcedureProfiles.* from "../shared-algebras/proofs/rule-core/unit-feature-procedure-profiles"

  var qClassLevel: int
  var qDamageDieSize: int
  var qUnitBound: bool
  var qLastResult: str

  action recordProjection(
    classLevel: int,
    damageDieSize: int,
    unitBound: bool,
    result: str,
  ): bool = all {
    qClassLevel' = classLevel,
    qDamageDieSize' = damageDieSize,
    qUnitBound' = unitBound,
    qLastResult' = result,
  }

  action init = recordProjection(0, 0, false, "init")

  action doProjectMartialArtsD12 = {
    val projected = battleRuntimeMartialArtsAttackProjection(
      true,
      false,
      MartialArtsMonkWeapon,
      17,
      1,
      3,
      1,
      4,
      6
    )
    all {
      recordProjection(
        17,
        projected.damageDieSize,
        true,
        if (projected.eligible) "projected" else "invalid"
      ),
    }
  }

  action step = any {
    doProjectMartialArtsD12,
  }
}
