// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts that granting Bardic
// Inspiration to a fifth-level Bard yields a d12 Bardic Inspiration die, instead
// of importing the feature reducer to recompute it. Keeps the import closure
// empty so MBT trace generation stays fast (see scripts/check-mbt-driver-closure.cjs).
module bardicInspirationSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | BardicInspiration

  type WitnessState = {
    qBonusActionAvailable: bool,
    qFeatureUsesRemaining: int,
    qTargetBardicInspirationDieSize: int,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qFeatureUsesRemaining: int = qState.qFeatureUsesRemaining
  pure def qTargetBardicInspirationDieSize: int = qState.qTargetBardicInspirationDieSize

  action recordProjection(
    bonusActionAvailable: bool,
    featureUsesRemaining: int,
    targetBardicInspirationDieSize: int,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qFeatureUsesRemaining: featureUsesRemaining,
      qTargetBardicInspirationDieSize: targetBardicInspirationDieSize,
      protocol: protocol,
    },
  }

  action init = recordProjection(true, 1, 0, witnessInit(BardicInspiration))

  // Granting Bardic Inspiration spends the Bonus Action and one use, and installs
  // a d12 die on the target (the fifth-level Bard's Bardic Inspiration die).
  action doGrantBardicInspirationD12 = all {
    qTargetBardicInspirationDieSize == 0,
    recordProjection(false, 0, 12, witnessResolved(BardicInspiration)),
  }

  action step = any {
    doGrantBardicInspirationD12,
  }
}
