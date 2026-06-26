// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Combat defines the battle
//   runtime layer entered from a Character Sheet projection.
// - .references/srd-5.2.1/Playing-the-Game.md#Hit Points defines the battle
//   Hit Point mutation settled back to the sheet.
// - UBIQUITOUS_LANGUAGE.md: Resolve, Apply, Hit Points, and Spell Effect.
module characterLayerProjectionLifecycleRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type CharacterLayerLifecycleRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: CharacterLayerLifecycleRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialCharacterLayerRoute: List[CharacterBattleRouteEvent] =
    List()

  pure def finalizeDraftToBuildRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeProjectCharacterSheetToBattle(
        SheetToBattleInitRouteSubject,
        CharacterBattleBuildProjectionOwner,
      )
    )

  pure def createSheetFromBuildRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeProjectCharacterSheetToBattle(
        SheetToBattleInitRouteSubject,
        CharacterBattleSheetOwner,
      )
    )

  pure def projectSheetToBattleInitRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeEnterBattleRuntime(
        SheetToBattleInitRouteSubject,
        CharacterBattleInitProjectionOwner,
      )
    )

  pure def resolveBattleRuntimeRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeEnterBattleRuntime(
        HandoffBattleMutationRouteSubject,
        CharacterBattleRuntimeOwner,
      )
    )

  pure def settleBattleToSheetRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeSettleBattleToCharacterSheet(
        BattleToSheetSettlementRouteSubject,
        HandoffBattleDeltaFill,
        Set(),
        CharacterBattleSettlementOwner,
      )
    )

  action recordRoute(
    route: List[CharacterBattleRouteEvent],
    replayIndex: int,
  ): bool = all {
    qState' = {
      replayIndex: replayIndex,
      qRoute: route,
    },
  }

  action init = recordRoute(initialCharacterLayerRoute, 0)

  action doFinalizeDraftToBuild = all {
    qState.replayIndex == 0,
    recordRoute(finalizeDraftToBuildRoute(qRoute), 1),
  }

  action doCreateSheetFromBuild = all {
    qState.replayIndex == 1,
    recordRoute(createSheetFromBuildRoute(qRoute), 2),
  }

  action doProjectSheetToBattleInit = all {
    qState.replayIndex == 2,
    recordRoute(projectSheetToBattleInitRoute(qRoute), 3),
  }

  action doResolveSkeletonShortswordAttack = all {
    qState.replayIndex == 3,
    recordRoute(resolveBattleRuntimeRoute(qRoute), 4),
  }

  action doSettleBattleToSheet = all {
    qState.replayIndex == 4,
    recordRoute(settleBattleToSheetRoute(qRoute), 5),
  }

  action step = any {
    doFinalizeDraftToBuild,
    doCreateSheetFromBuild,
    doProjectSheetToBattleInit,
    doResolveSkeletonShortswordAttack,
    doSettleBattleToSheet,
  }
}
