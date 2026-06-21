// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Cleric.md#Level 1: Divine Order.
// - .references/srd-5.2.1/Classes/Druid.md#Level 1: Primal Order.
// - packages/character-creation-runtime/VOCABULARY.md: Unit-backed selection
//   records accepted option metadata instead of treating option ids as
//   executable mechanics.
module characterCreationClericDruidOrderSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type OrderRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: OrderRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialOrderRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainOrderRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeRetainCreationSelectedReferences(
          CreationSelectedReferenceRouteSubject,
          CreationSelectedReferenceOwner,
        )
      )
      .append(
        routeProjectCharacterBuildFacts(
          CreationBuildProjectionRouteSubject,
          CharacterBuildOwner,
        )
      )

  action recordRoute(route: List[CharacterCreationRouteEvent]): bool = all {
    qState' = {
      ready: false,
      qRoute: route,
    },
  }

  action init = all {
    qState' = {
      ready: true,
      qRoute: initialOrderRoute,
    },
  }

  action doSelectClericProtectorOrder = all {
    qState.ready,
    recordRoute(retainOrderRoute(qRoute)),
  }

  action doSelectClericThaumaturgeOrder = all {
    qState.ready,
    recordRoute(retainOrderRoute(qRoute)),
  }

  action doSelectDruidMagicianOrder = all {
    qState.ready,
    recordRoute(retainOrderRoute(qRoute)),
  }

  action doSelectDruidWardenOrder = all {
    qState.ready,
    recordRoute(retainOrderRoute(qRoute)),
  }

  action step = any {
    doSelectClericProtectorOrder,
    doSelectClericThaumaturgeOrder,
    doSelectDruidMagicianOrder,
    doSelectDruidWardenOrder,
  }
}
