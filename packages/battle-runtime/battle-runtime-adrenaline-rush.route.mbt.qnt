// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Character-Origins.md#Orc defines a trait that lets
//   the creature take Dash as a Bonus Action, grants Temporary Hit Points equal
//   to Proficiency Bonus, spends Proficiency Bonus uses, and restores uses on
//   Short or Long Rest.
// - .references/srd-5.2.1/Playing-the-Game.md#Actions defines Dash as extra
//   movement equal to Speed.
// - .references/srd-5.2.1/Playing-the-Game.md#Bonus Actions defines one Bonus
//   Action per turn when a feature grants one.
// - .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points defines
//   Temporary Hit Points as a separate buffer that does not stack with HP.
// - UBIQUITOUS_LANGUAGE.md: Bonus Action, Movement, Speed, Pool, Spend, and
//   Temporary Hit Points.
module battleRuntimeAdrenalineRushRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | BonusActionDashTemporaryHitPoints

  type WitnessState = {
    qActorTempHp: int,
    qBonusActionAvailable: bool,
    qDashBonusFeet: int,
    qFeatureUsesRemaining: int,
    protocol: WitnessProtocol[WitnessHole],
    qRoute: List[ReducerRouteEvent],
  }

  var qState: WitnessState

  pure def qActorTempHp: int = qState.qActorTempHp
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qDashBonusFeet: int = qState.qDashBonusFeet
  pure def qFeatureUsesRemaining: int = qState.qFeatureUsesRemaining
  pure def qRoute: List[ReducerRouteEvent] = qState.qRoute

  pure val featureDashProficiencyBonus: int = 3
  pure val featureDashSpeedFeet: int = 30

  pure val initialFeatureDashRoute: List[ReducerRouteEvent] =
    List(
      routeStartBattle(BattleActionEconomyOwner),
      routeDiscoverBattleActs(
        UnitFeatureBonusActionRouteSubject,
        Set(),
        BattleFeatureResourceOwner,
      ),
    )

  pure def resolvedFeatureDashRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route
      .append(
        routeResolveBattleSubjectWithoutFill(
          UnitFeatureBonusActionRouteSubject,
          Set(),
          BattleActionEconomyOwner,
        )
      )
      .append(
        routeResolveBattleSubjectWithoutFill(
          UnitFeatureBonusActionRouteSubject,
          Set(),
          BattleFeatureResourceOwner,
        )
      )
      .append(
        routeResolveBattleSubjectWithoutFill(
          UnitFeatureBonusActionRouteSubject,
          Set(),
          BattleMovementResourceOwner,
        )
      )
      .append(
        routeResolveBattleSubjectWithoutFill(
          UnitFeatureBonusActionRouteSubject,
          Set(),
          BattleTemporaryHitPointOwner,
        )
      )

  pure def staleFeatureDashRoute(
    route: List[ReducerRouteEvent],
  ): List[ReducerRouteEvent] =
    route.append(
      routeResolveBattleSubjectWithoutFill(
        UnitFeatureBonusActionRouteSubject,
        Set(),
        BattleActionEconomyOwner,
      )
    )

  action recordProjection(
    actorTempHp: int,
    bonusActionAvailable: bool,
    dashBonusFeet: int,
    featureUsesRemaining: int,
    protocol: WitnessProtocol[WitnessHole],
    route: List[ReducerRouteEvent],
  ): bool = all {
    qState' = {
      qActorTempHp: actorTempHp,
      qBonusActionAvailable: bonusActionAvailable,
      qDashBonusFeet: dashBonusFeet,
      qFeatureUsesRemaining: featureUsesRemaining,
      protocol: protocol,
      qRoute: route,
    },
  }

  action init =
    recordProjection(
      1,
      true,
      0,
      3,
      witnessInit(BonusActionDashTemporaryHitPoints),
      initialFeatureDashRoute,
    )

  action doAdrenalineRushDash = all {
    qBonusActionAvailable,
    qFeatureUsesRemaining > 0,
    recordProjection(
      featureDashProficiencyBonus,
      false,
      featureDashSpeedFeet,
      qFeatureUsesRemaining - 1,
      witnessResolved(BonusActionDashTemporaryHitPoints),
      resolvedFeatureDashRoute(qRoute),
    ),
  }

  action doRejectSecondDash = all {
    not(qBonusActionAvailable),
    recordProjection(
      qActorTempHp,
      qBonusActionAvailable,
      qDashBonusFeet,
      qFeatureUsesRemaining,
      witnessInvalid(BonusActionDashTemporaryHitPoints, WStaleSubject),
      staleFeatureDashRoute(qRoute),
    ),
  }

  action step = any {
    doAdrenalineRushDash,
    doRejectSecondDash,
  }
}
