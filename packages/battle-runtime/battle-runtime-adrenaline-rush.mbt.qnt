// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts the SRD outcome of the
// Adrenaline Rush Bonus Action Dash directly, instead of re-running the movement
// reducer. This keeps the driver's import closure empty so its MBT trace
// generation stays fast (see scripts/check-mbt-driver-closure.cjs). The expected
// facts are the movement reducer's SRD formalization for this fixture; if that
// rule changes, update the literals here.
module battleRuntimeAdrenalineRushMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AdrenalineRush

  type WitnessState = {
    qActorTempHp: int,
    qBonusActionAvailable: bool,
    qDashBonusFeet: int,
    qFeatureUsesRemaining: int,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActorTempHp: int = qState.qActorTempHp
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qDashBonusFeet: int = qState.qDashBonusFeet
  pure def qFeatureUsesRemaining: int = qState.qFeatureUsesRemaining

  pure val adrenalineRushProficiencyBonus: int = 3
  pure val adrenalineRushSpeedFeet: int = 30

  action recordProjection(
    actorTempHp: int,
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    featureUsesRemaining: int,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qActorTempHp: actorTempHp,
      qBonusActionAvailable: bonusActionAvailable,
      qDashBonusFeet: dashBonusFeet,
      qFeatureUsesRemaining: featureUsesRemaining,
      protocol: protocol,
    },
  }

  action init =
    recordProjection(1, true, 0, 3, witnessInit(AdrenalineRush))

  // SRD outcome for this fixture (one use spent from 3, fighter at walk speed 30,
  // proficiency bonus 3): the Bonus Action Dash adds the walk speed to movement,
  // grants temporary Hit Points equal to the proficiency bonus (higher than the
  // prior 1, so it replaces it), and spends the Bonus Action.
  action doAdrenalineRushDash = all {
    qBonusActionAvailable,
    qFeatureUsesRemaining > 0,
    recordProjection(
      adrenalineRushProficiencyBonus,
      false,
      adrenalineRushSpeedFeet,
      qFeatureUsesRemaining - 1,
      witnessResolved(AdrenalineRush)
    ),
  }

  action doRejectSecondDash = all {
    not(qBonusActionAvailable),
    recordProjection(
      qActorTempHp,
      qBonusActionAvailable,
      qDashBonusFeet,
      qFeatureUsesRemaining,
      witnessInvalid(AdrenalineRush, WStaleSubject)
    ),
  }

  action step = any {
    doAdrenalineRushDash,
    doRejectSecondDash,
  }
}
