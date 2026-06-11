// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts that a 17th-level Monk's
// Martial Arts attack projects a d12 damage die, instead of importing the feature
// reducer to recompute it. Keeps the import closure empty so MBT trace generation
// stays fast (see scripts/check-mbt-driver-closure.cjs).
module monkMartialArtsSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  var qClassLevel: int
  var qDamageDieSize: int
  var qUnitBound: bool
  var qScenarioResult: str
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def qLastResult: str = qScenarioResult

  pure def witnessProtocolForProjection(
    result: str,
  ): WitnessProtocol[WitnessHole] =
    if (result == "init") witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    classLevel: int,
    damageDieSize: int,
    unitBound: bool,
    result: str,
  ): bool = all {
    qClassLevel' = classLevel,
    qDamageDieSize' = damageDieSize,
    qUnitBound' = unitBound,
    qScenarioResult' = result,
    qProtocol' = witnessProtocolForProjection(result),
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
