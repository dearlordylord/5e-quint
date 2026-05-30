// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts that a 17th-level Monk's
// Martial Arts attack projects a d12 damage die, instead of importing the feature
// reducer to recompute it. Keeps the import closure empty so MBT trace generation
// stays fast (see scripts/check-mbt-driver-closure.cjs).
module monkMartialArtsSelectedIdentityMbt {
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

  // At 17th level the Monk's Martial Arts die is a d12, and a Monk weapon is an
  // eligible Martial Arts attack, so the projection succeeds.
  action doProjectMartialArtsD12 = all {
    recordProjection(17, 12, true, "projected"),
  }

  action step = any {
    doProjectMartialArtsD12,
  }
}
