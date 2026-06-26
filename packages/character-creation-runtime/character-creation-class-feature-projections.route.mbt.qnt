// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Character-Creation.md#Record Class Features:
//   class-feature facts are recorded during creation.
// - packages/character-creation-runtime/VOCABULARY.md: Character Build stores
//   retained evidence while derived resource and source facts are projected
//   from the build plus the Unit catalog.
module characterCreationClassFeatureProjectionsRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type ProjectionRouteState = {
    replayIndex: int,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: ProjectionRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialProjectionRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def projectBuildFactsRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route.append(
      routeProjectCharacterBuildFacts(
        CreationBuildProjectionRouteSubject,
        CharacterBuildOwner,
      )
    )

  action recordRoute(
    replayIndex: int,
    route: List[CharacterCreationRouteEvent],
  ): bool = all {
    qState' = {
      replayIndex: replayIndex,
      qRoute: route,
    },
  }

  action init =
    recordRoute(0, initialProjectionRoute)

  action doProjectMonkFocusAndUncannyMetabolism = all {
    qState.replayIndex == 0,
    recordRoute(1, projectBuildFactsRoute(qRoute)),
  }

  action doProjectSorcererFontAndMetamagic = all {
    qState.replayIndex == 1,
    recordRoute(2, projectBuildFactsRoute(qRoute)),
  }

  action step = any {
    doProjectMonkFocusAndUncannyMetabolism,
    doProjectSorcererFontAndMetamagic,
  }
}
