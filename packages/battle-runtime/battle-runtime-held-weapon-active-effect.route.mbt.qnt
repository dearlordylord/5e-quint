// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh defines a
//   Bonus Action held-weapon Spell Effect with spellcasting ability attack and
//   damage replacement, damage type choice, duration, recast end, and let-go
//   cleanup.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack and
//   #Damage Rolls define attack-roll, damage-roll, and HP ownership for weapon
//   attacks that consume the held-weapon Spell Effect.
// - UBIQUITOUS_LANGUAGE.md: Attack Roll, Damage Roll, Bonus Action, Spend,
//   Spell Effect, Hit Points, and Holding / Wielding.
module battleRuntimeHeldWeaponActiveEffectRouteMbt {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type HeldWeaponActiveEffectRouteStage =
    | FreshRouteSurface
    | HeldWeaponActiveEffectRouteSurface
    | HeldWeaponAttackRollRouteSurface
    | HeldWeaponDamageRouteSurface

  var qSurface: HeldWeaponActiveEffectRouteStage
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def routeHeldWeaponWithResolve(
    holes: Set[BattleHoleFamilyKind],
    discoverOwner: ReducerRouteOwnerGroup,
    fill: BattleFillKind,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        HeldWeaponActiveEffectRouteSubject,
        holes,
        discoverOwner,
      ),
      routeResolveBattleSubject(
        HeldWeaponActiveEffectRouteSubject,
        fill,
        nextHoles,
        resolveOwner,
      ),
    )

  pure def routeHeldWeaponWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    discoverOwner: ReducerRouteOwnerGroup,
    nextHoles: Set[BattleHoleFamilyKind],
    resolveOwner: ReducerRouteOwnerGroup,
  ): List[ReducerRouteEvent] =
    List(
      startRoute,
      routeDiscoverBattleActs(
        HeldWeaponActiveEffectRouteSubject,
        holes,
        discoverOwner,
      ),
      routeResolveBattleSubjectWithoutFill(
        HeldWeaponActiveEffectRouteSubject,
        nextHoles,
        resolveOwner,
      ),
    )

  action recordSurface(
    surface: HeldWeaponActiveEffectRouteStage,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doRouteHeldWeaponActiveEffect = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      HeldWeaponActiveEffectRouteSurface,
      routeHeldWeaponWithoutFill(
        Set(),
        BattleActionEconomyOwner,
        Set(),
        BattleActiveEffectOwner,
      ),
    ),
  }

  action doRouteHeldWeaponAttackRoll = all {
    qSurface == HeldWeaponActiveEffectRouteSurface,
    recordSurface(
      HeldWeaponAttackRollRouteSurface,
      routeHeldWeaponWithResolve(
        Set(AttackRollHoleKind),
        BattleActiveEffectOwner,
        AttackRollFillKind,
        Set(RolledDiceHoleKind),
        BattleAttackRollOwner,
      ),
    ),
  }

  action doRouteHeldWeaponDamage = all {
    qSurface == HeldWeaponAttackRollRouteSurface,
    recordSurface(
      HeldWeaponDamageRouteSurface,
      routeHeldWeaponWithResolve(
        Set(RolledDiceHoleKind),
        BattleActiveEffectOwner,
        RolledDiceFillKind,
        Set(),
        BattleHitPointOwner,
      ),
    ),
  }

  action step = any {
    doRouteHeldWeaponActiveEffect,
    doRouteHeldWeaponAttackRoll,
    doRouteHeldWeaponDamage,
  }
}
