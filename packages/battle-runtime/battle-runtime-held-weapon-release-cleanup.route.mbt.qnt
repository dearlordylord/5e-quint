// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh defines that
//   the Spell Effect ends if the caster lets go of the weapon.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Duration defines
//   generic Spell Effect duration and end conditions.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect, Duration, and Holding / Wielding.
module battleRuntimeHeldWeaponReleaseCleanupRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type HeldWeaponReleaseCleanupRouteStage =
    | FreshRouteSurface
    | HeldWeaponReleaseCleanupRouteSurface

  var qSurface: HeldWeaponReleaseCleanupRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  action recordSurface(
    surface: HeldWeaponReleaseCleanupRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteHeldWeaponReleaseCleanup = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      HeldWeaponReleaseCleanupRouteSurface,
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
    doRouteHeldWeaponReleaseCleanup,
  }
}
