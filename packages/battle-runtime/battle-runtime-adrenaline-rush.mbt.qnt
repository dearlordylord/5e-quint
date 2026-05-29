// -*- mode: Bluespec; -*-

// Self-contained literal projection witness: asserts the SRD outcome of the
// Adrenaline Rush Bonus Action Dash directly, instead of re-running the movement
// reducer. This keeps the driver's import closure empty so its MBT trace
// generation stays fast (see scripts/check-mbt-driver-closure.cjs). The expected
// facts are the movement reducer's SRD formalization for this fixture; if that
// rule changes, update the literals here.
module battleRuntimeAdrenalineRushMbt {
  var qActorTempHp: int
  var qBonusActionAvailable: bool
  var qDashBonusFeet: int
  var qFeatureUsesRemaining: int
  var qLastResult: str
  var qLastInvalidReason: str

  pure val adrenalineRushProficiencyBonus: int = 3
  pure val adrenalineRushSpeedFeet: int = 30

  action recordProjection(
    actorTempHp: int,
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    featureUsesRemaining: int,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qActorTempHp' = actorTempHp,
    qBonusActionAvailable' = bonusActionAvailable,
    qDashBonusFeet' = dashBonusFeet,
    qFeatureUsesRemaining' = featureUsesRemaining,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
  }

  action init =
    recordProjection(1, true, 0, 3, "init", "")

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
      "resolved",
      ""
    ),
  }

  action doRejectSecondDash = all {
    not(qBonusActionAvailable),
    recordProjection(
      qActorTempHp,
      qBonusActionAvailable,
      qDashBonusFeet,
      qFeatureUsesRemaining,
      "invalid",
      "staleSubject"
    ),
  }

  action step = any {
    doAdrenalineRushDash,
    doRejectSecondDash,
  }
}
