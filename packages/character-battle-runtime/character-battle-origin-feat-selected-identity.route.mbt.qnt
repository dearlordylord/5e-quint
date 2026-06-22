// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Initiative defines Initiative
//   as the combat turn-order fact projected into battle.
// - UBIQUITOUS_LANGUAGE.md: Initiative and selected-reference handoff.
module characterBattleOriginFeatSelectedIdentityRouteMbt {
  import characterBattleReducerRoute.* from "./character-battle-reducer-route"

  type OriginFeatHandoffRouteState = {
    replayIndex: int,
    qRoute: List[CharacterBattleRouteEvent],
  }

  var qState: OriginFeatHandoffRouteState

  pure def qRoute: List[CharacterBattleRouteEvent] = qState.qRoute

  pure val initialOriginFeatHandoffRoute: List[CharacterBattleRouteEvent] =
    List()

  pure def retainOriginFeatRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route.append(
      routeProjectCharacterSheetToBattle(
        HandoffSelectedReferenceRouteSubject,
        CharacterBattleBuildProjectionOwner,
      )
    )

  pure def projectInitiativeHandoffRoute(
    route: List[CharacterBattleRouteEvent],
  ): List[CharacterBattleRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetToBattle(
          HandoffSelectedReferenceRouteSubject,
          CharacterBattleInitProjectionOwner,
        )
      )
      .append(
        routeEnterBattleRuntime(
          HandoffSelectedReferenceRouteSubject,
          CharacterBattleRuntimeOwner,
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

  action init = recordRoute(initialOriginFeatHandoffRoute, 0)

  action doFinalizeCriminalAlertOriginFeat = all {
    qState.replayIndex == 0,
    recordRoute(retainOriginFeatRoute(qRoute), 1),
  }

  action doProjectAlertInitiativeHandoff = all {
    qState.replayIndex == 1,
    recordRoute(projectInitiativeHandoffRoute(qRoute), 2),
  }

  action step = any {
    doFinalizeCriminalAlertOriginFeat,
    doProjectAlertInitiativeHandoff,
  }
}
