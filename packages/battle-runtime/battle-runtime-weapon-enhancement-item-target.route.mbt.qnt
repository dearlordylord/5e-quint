// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Magic Weapon defines a
//   Bonus Action item-targeted weapon enhancement with attack and damage
//   bonuses, one-hour duration, and same-spell replacement.
// - plans/rules-kernel-coverage/battle-hole-frontier.jsonl classifies the
//   target item as caller/table inventory evidence, not a reducer-owned route
//   hole.
// - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spend, Spell Effect, and Holding /
//   Wielding.
module battleRuntimeWeaponEnhancementItemTargetRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WeaponEnhancementItemTargetRouteStage =
    | FreshRouteSurface
    | WeaponEnhancementItemTargetRouteSurface

  var qSurface: WeaponEnhancementItemTargetRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  action recordSurface(
    surface: WeaponEnhancementItemTargetRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteWeaponEnhancementItemTarget = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      WeaponEnhancementItemTargetRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          WeaponEnhancementItemTargetRouteSubject,
          Set(),
          BattleItemTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          WeaponEnhancementItemTargetRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action step = any {
    doRouteWeaponEnhancementItemTarget,
  }
}
