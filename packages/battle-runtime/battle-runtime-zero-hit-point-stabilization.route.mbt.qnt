// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spare the Dying says a
//   0-Hit-Point non-dead target becomes Stable.
// - .references/srd-5.2.1/Playing-the-Game.md#Death Saving Throws says Death
//   Saving Throw successes and failures reset when a creature becomes Stable.
// - .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points says
//   Temporary Hit Points are not Hit Points or healing.
// - UBIQUITOUS_LANGUAGE.md: Hit Points and Death.
module battleRuntimeZeroHitPointStabilizationRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type ZeroHitPointStabilizationRouteSurface =
    | FreshRouteSurface
    | ZeroHitPointStabilizationTargetFrontierRouteSurface
    | ZeroHitPointStabilizationResolvedRouteSurface

  var qSurface: ZeroHitPointStabilizationRouteSurface
  var qTargetHp: int
  var qTargetTemporaryHp: int
  var qTargetStable: bool
  var qTargetUnconscious: bool
  var qTargetDead: bool
  var qTargetDeathSuccesses: int
  var qTargetDeathFailures: int
  var qRoute: List[ReducerRouteEvent]

  action recordProjection(
    surface: ZeroHitPointStabilizationRouteSurface,
    targetHp: int,
    targetTemporaryHp: int,
    targetStable: bool,
    targetUnconscious: bool,
    targetDead: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qTargetHp' = targetHp,
    qTargetTemporaryHp' = targetTemporaryHp,
    qTargetStable' = targetStable,
    qTargetUnconscious' = targetUnconscious,
    qTargetDead' = targetDead,
    qTargetDeathSuccesses' = targetDeathSuccesses,
    qTargetDeathFailures' = targetDeathFailures,
    qRoute' = route,
  }

  action init = recordProjection(
    FreshRouteSurface,
    0,
    3,
    false,
    true,
    false,
    2,
    1,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverZeroHitPointStabilizationTarget = all {
    qSurface == FreshRouteSurface,
    recordProjection(
      ZeroHitPointStabilizationTargetFrontierRouteSurface,
      qTargetHp,
      qTargetTemporaryHp,
      qTargetStable,
      qTargetUnconscious,
      qTargetDead,
      qTargetDeathSuccesses,
      qTargetDeathFailures,
      qRoute.append(
        routeDiscoverBattleActs(
          ZeroHitPointStabilizationRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doResolveZeroHitPointStabilizationTarget = all {
    qSurface == ZeroHitPointStabilizationTargetFrontierRouteSurface,
    qTargetHp == 0,
    not(qTargetDead),
    recordProjection(
      ZeroHitPointStabilizationResolvedRouteSurface,
      0,
      qTargetTemporaryHp,
      true,
      true,
      false,
      0,
      0,
      qRoute.append(
        routeResolveBattleSubject(
          ZeroHitPointStabilizationRouteSubject,
          TargetChoiceFillKind,
          Set(),
          BattleHitPointAndZeroHpLifecycleOwner,
        )
      ),
    ),
  }

  action step = any {
    doDiscoverZeroHitPointStabilizationTarget,
    doResolveZeroHitPointStabilizationTarget,
  }
}
