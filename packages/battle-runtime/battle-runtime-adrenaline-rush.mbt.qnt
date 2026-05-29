// -*- mode: Bluespec; -*-

module battleRuntimeAdrenalineRushMbt {
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeModel.* from "./battle-runtime-model"

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

  action doAdrenalineRushDash = all {
    qBonusActionAvailable,
    qFeatureUsesRemaining > 0,
    val state = {
      ...initialState,
      fighter: { ...initialState.fighter, tempHp: qActorTempHp, speed: adrenalineRushSpeedFeet },
      bonusActionAvailable: qBonusActionAvailable,
      dashMovementBonus: qDashBonusFeet,
    }
    val result = bonusActionDashTemporaryHitPointsFighter(
      state,
      qFeatureUsesRemaining,
      adrenalineRushProficiencyBonus,
      WalkSpeedKind
    )
    recordProjection(
      result.state.fighter.tempHp,
      result.state.bonusActionAvailable,
      result.state.dashMovementBonus,
      result.usesRemaining,
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
