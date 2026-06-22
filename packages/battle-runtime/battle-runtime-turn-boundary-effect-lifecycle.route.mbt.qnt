// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat defines
//   initiative-ordered turns and round advancement.
// - .references/srd-5.2.1/Rules-Glossary.md#Simultaneous Effects defines the
//   table-chosen order for same-timing effects.
// - UBIQUITOUS_LANGUAGE.md: Boundary Crossing, Spell Effect, Timer, and Turn
//   Structure.
module battleRuntimeTurnBoundaryEffectLifecycleRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type TurnBoundaryLifecycleRouteSurface =
    | FreshRouteSurface
    | TargetStartTurnResolvedRouteSurface
    | SourceNextTurnResolvedRouteSurface

  var qSurface: TurnBoundaryLifecycleRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverBoundary(
    holes: Set[BattleHoleFamilyKind],
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      TurnBoundaryEffectLifecycleRouteSubject,
      holes,
      BattleTurnBoundaryOwner,
    )

  pure def resolveBoundary(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      TurnBoundaryEffectLifecycleRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveBoundaryWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      TurnBoundaryEffectLifecycleRouteSubject,
      Set(),
      owner,
    )

  action recordSurface(
    surface: TurnBoundaryLifecycleRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordSurface(FreshRouteSurface, List(startRoute))

  action doResolveTargetStartTurn = all {
    qSurface == FreshRouteSurface,
    recordSurface(
      TargetStartTurnResolvedRouteSurface,
      qRoute
        .append(discoverBoundary(Set(RolledDiceHoleKind, SavingThrowOutcomeHoleKind)))
        .append(
          resolveBoundary(
            RolledDiceFillKind,
            Set(SavingThrowOutcomeHoleKind),
            BattleHitPointOwner,
          )
        )
        .append(
          resolveBoundary(
            SavingThrowOutcomeFillKind,
            Set(),
            BattleActiveEffectOwner,
          )
        ),
    ),
  }

  action doResolveSourceNextTurn = all {
    qSurface == TargetStartTurnResolvedRouteSurface,
    recordSurface(
      SourceNextTurnResolvedRouteSurface,
      qRoute
        .append(discoverBoundary(Set(RolledDiceHoleKind)))
        .append(resolveBoundary(RolledDiceFillKind, Set(), BattleHitPointOwner))
        .append(resolveBoundaryWithoutFill(BattleActiveEffectOwner))
        .append(resolveBoundaryWithoutFill(BattleTurnBoundaryOwner)),
    ),
  }

  action step = any {
    doResolveTargetStartTurn,
    doResolveSourceNextTurn,
  }
}
