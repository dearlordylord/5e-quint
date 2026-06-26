// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Magic Weapon defines the
//   one-hour Spell Effect duration and same-spell replacement cleanup shape.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Duration defines
//   generic Spell Effect duration and end conditions.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect, Duration, and Holding / Wielding.
module battleRuntimeWeaponEnhancementCleanupRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WeaponEnhancementCleanupRouteSurface =
    | FreshRouteSurface
    | WeaponEnhancementDurationCleanupRouteSurface

  var qSurface: WeaponEnhancementCleanupRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  action recordSurface(
    surface: WeaponEnhancementCleanupRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteWeaponEnhancementDurationCleanup = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      WeaponEnhancementDurationCleanupRouteSurface,
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
    doRouteWeaponEnhancementDurationCleanup,
  }
}
