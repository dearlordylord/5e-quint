// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Favor defines the
//   one-minute Spell Effect duration for the weapon damage rider.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Duration defines
//   generic Spell Effect duration and end conditions.
// - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Spell Effect, and Duration.
module battleRuntimeWeaponDamageRiderCleanupRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WeaponDamageRiderCleanupRouteSurface =
    | FreshRouteSurface
    | WeaponDamageRiderDurationCleanupRouteSurface

  var qSurface: WeaponDamageRiderCleanupRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  action recordSurface(
    surface: WeaponDamageRiderCleanupRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteWeaponDamageRiderDurationCleanup = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      WeaponDamageRiderDurationCleanupRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          WeaponHostedSpellEffectCleanupRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          WeaponHostedSpellEffectCleanupRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action step = any {
    doRouteWeaponDamageRiderDurationCleanup,
  }
}
