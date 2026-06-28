// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Starry Wisp targets one
//   creature or object, makes a ranged spell attack, deals Radiant damage on a
//   hit, and makes the target emit Dim Light while denying Invisible benefits.
// - .references/srd-5.2.1/Rules-Glossary.md#Breaking Objects defines object
//   Armor Class and Hit Point facts as object/table facts.
// - UBIQUITOUS_LANGUAGE.md: Table Decision, Attack Roll, Damage, Spell
//   Invocation, and Spell Effect.
module battleRuntimeStarryWispObjectRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type StarryWispObjectRouteSurface =
    | FreshObjectRouteSurface
    | ObjectTargetBoundaryRouteSurface
    | ObjectTargetBoundaryRejectionRouteSurface
    | ObjectAttackMissRouteSurface
    | ObjectAttackHitRouteSurface
    | ObjectDamageAndLightRouteSurface
    | ObjectStaleReplayRouteSurface

  var qSurface: StarryWispObjectRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  action recordSurface(
    surface: StarryWispObjectRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshObjectRouteSurface, List(startRoute))

  action doRouteObjectTargetBoundary = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectTargetBoundaryRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(AttackRollHoleKind),
          BattleObjectTargetBoundaryOwner,
        ),
      ),
    ),
  }

  action doRouteRejectObjectWithoutBoundaryFact = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectTargetBoundaryRejectionRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
      ),
    ),
  }

  action doRouteObjectAttackMiss = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectAttackMissRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(AttackRollHoleKind),
          BattleAttackRollOwner,
        ),
        routeResolveBattleSubject(
          ObjectTargetSpellAttackRouteSubject,
          AttackRollFillKind,
          Set(),
          BattleAttackRollOwner,
        ),
      ),
    ),
  }

  action doRouteObjectAttackHit = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectAttackHitRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(AttackRollHoleKind),
          BattleAttackRollOwner,
        ),
        routeResolveBattleSubject(
          ObjectTargetSpellAttackRouteSubject,
          AttackRollFillKind,
          Set(RolledDiceHoleKind),
          BattleAttackRollOwner,
        ),
      ),
    ),
  }

  action doRouteObjectDamageAndLight = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectDamageAndLightRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(RolledDiceHoleKind),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubject(
          ObjectTargetSpellAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
      ),
    ),
  }

  action doRouteRejectStaleAfterResolved = all {
    qSurface == FreshObjectRouteSurface,
    recordSurface(
      ObjectStaleReplayRouteSurface,
      List(
        startRoute,
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(AttackRollHoleKind),
          BattleObjectTargetBoundaryOwner,
        ),
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(AttackRollHoleKind),
          BattleAttackRollOwner,
        ),
        routeResolveBattleSubject(
          ObjectTargetSpellAttackRouteSubject,
          AttackRollFillKind,
          Set(RolledDiceHoleKind),
          BattleAttackRollOwner,
        ),
        routeDiscoverBattleActs(
          ObjectTargetSpellAttackRouteSubject,
          Set(RolledDiceHoleKind),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubject(
          ObjectTargetSpellAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleObjectTargetBoundaryOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        ),
        routeResolveBattleSubjectWithoutFill(
          ObjectTargetSpellAttackRouteSubject,
          Set(),
          BattleHoleFrontierOwner,
        ),
      ),
    ),
  }

  action step = any {
    doRouteObjectTargetBoundary,
    doRouteRejectObjectWithoutBoundaryFact,
    doRouteObjectAttackMiss,
    doRouteObjectAttackHit,
    doRouteObjectDamageAndLight,
    doRouteRejectStaleAfterResolved,
  }
}
