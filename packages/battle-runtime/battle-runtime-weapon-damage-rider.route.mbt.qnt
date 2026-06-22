// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Divine Favor defines a
//   Bonus Action Spell Effect whose weapon attacks deal extra Radiant damage
//   on a hit.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls and #Hit Points
//   define the damage-roll and HP ownership consumed by the damage rider.
// - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Spend, Spell
//   Effect, Damage Roll, and Hit Points.
module battleRuntimeWeaponDamageRiderRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type WeaponDamageRiderRouteSurface =
    | FreshRouteSurface
    | WeaponDamageRiderActiveEffectRouteSurface
    | WeaponDamageRiderDamageRouteSurface

  var qSurface: WeaponDamageRiderRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def routeWeaponDamageRiderWithResolve(
    holes: Set[BattleHoleFamilyKind],
    discoverOwner: ReducerRouteOwnerGroup,
    fill: BattleFillKind,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        WeaponDamageRiderRouteSubject,
        holes,
        discoverOwner,
      ),
      routeResolveBattleSubject(
        WeaponDamageRiderRouteSubject,
        fill,
        nextHoles,
        resolveOwner,
      ),
    )

  pure def routeWeaponDamageRiderWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    discoverOwner: ReducerRouteOwnerGroup,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        WeaponDamageRiderRouteSubject,
        holes,
        discoverOwner,
      ),
      routeResolveBattleSubjectWithoutFill(
        WeaponDamageRiderRouteSubject,
        nextHoles,
        resolveOwner,
      ),
    )

  action recordSurface(
    surface: WeaponDamageRiderRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteWeaponDamageRiderActiveEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      WeaponDamageRiderActiveEffectRouteSurface,
      routeWeaponDamageRiderWithoutFill(
        Set(),
        BattleSpellSlotAndActionEconomyOwner,
        Set(),
        BattleActiveEffectOwner,
      ),
    ),
  }

  action doRouteWeaponDamageRiderDamage = all {
    qSurface == WeaponDamageRiderActiveEffectRouteSurface,
    recordSurface(
      WeaponDamageRiderDamageRouteSurface,
      routeWeaponDamageRiderWithResolve(
        Set(RolledDiceHoleKind),
        BattleActiveEffectOwner,
        RolledDiceFillKind,
        Set(),
        BattleHitPointOwner,
      ),
    ),
  }

  action step = any {
    doRouteWeaponDamageRiderActiveEffect,
    doRouteWeaponDamageRiderDamage,
  }
}
