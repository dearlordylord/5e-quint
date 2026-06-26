// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Fighter.md#Level 1: Fighting Style:
//   choose a Fighting Style feat, and replace it when gaining a Fighter level.
// - packages/character-creation-runtime/VOCABULARY.md: Character Build Class
//   Level Gain includes replacement choices as part of the advancement
//   operation.
module characterCreationFighterFightingStyleSelectedIdentityRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"
  import characterCreationRouteFixtures.* from "./character-creation-route-fixtures"

  type FightingStyleRouteState = {
    ready: bool,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: FightingStyleRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialFightingStyleRoute: List[CharacterCreationRouteEvent] =
    completedFighterCreationRoute

  pure def retainInitialFightingStyleRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route.append(
      routeRetainCreationSelectedReferences(
        CreationSelectedReferenceRouteSubject,
        CreationSelectedReferenceOwner,
      )
    )

  pure def replaceFightingStyleRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeApplyCreationFillBatch(
          CreationSelectedReferenceRouteSubject,
          Set(CreationChoiceSetFill),
          Set(),
          CharacterBuildOwner,
        )
      )
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
      qRoute: initialFightingStyleRoute,
    },
  }

  action doSelectDefenseFightingStyle = all {
    qState.ready,
    recordRoute(retainInitialFightingStyleRoute(qRoute)),
  }

  action doSelectArcheryFightingStyle = all {
    qState.ready,
    recordRoute(retainInitialFightingStyleRoute(qRoute)),
  }

  action doSelectGreatWeaponFightingStyle = all {
    qState.ready,
    recordRoute(retainInitialFightingStyleRoute(qRoute)),
  }

  action doSelectTwoWeaponFightingStyle = all {
    qState.ready,
    recordRoute(retainInitialFightingStyleRoute(qRoute)),
  }

  action doReplaceArcheryWithDefenseOnFighterLevelGain = all {
    qState.ready,
    recordRoute(replaceFightingStyleRoute(qRoute)),
  }

  action doReplaceDefenseWithArcheryOnFighterLevelGain = all {
    qState.ready,
    recordRoute(replaceFightingStyleRoute(qRoute)),
  }

  action doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain = all {
    qState.ready,
    recordRoute(replaceFightingStyleRoute(qRoute)),
  }

  action doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain = all {
    qState.ready,
    recordRoute(replaceFightingStyleRoute(qRoute)),
  }

  action step = any {
    doSelectDefenseFightingStyle,
    doSelectArcheryFightingStyle,
    doSelectGreatWeaponFightingStyle,
    doSelectTwoWeaponFightingStyle,
    doReplaceArcheryWithDefenseOnFighterLevelGain,
    doReplaceDefenseWithArcheryOnFighterLevelGain,
    doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain,
    doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain,
  }
}
