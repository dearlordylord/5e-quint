// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Armor Class: a character can
//   use only one base Armor Class calculation.
// - .references/srd-5.2.1/Character-Creation.md#Armor Class: armor, Shield,
//   and class features can define Armor Class.
// - UBIQUITOUS_LANGUAGE.md: Armor Class and Armor Category.
module characterSheetArmorClassBaseSelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type ArmorClassRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: ArmorClassRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialArmorClassRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def selectArmorClassBaseRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeRetainCharacterSheetSelectedReferences(
          SheetSelectedReferenceProjectionRouteSubject,
          CharacterSheetSelectedReferenceOwner,
        )
      )
      .append(
        routeProjectCharacterSheetFacts(
          SheetArmorClassProjectionRouteSubject,
          CharacterSheetBuildProjectionOwner,
        )
      )

  action recordRoute(route: List[CharacterSheetRouteEvent]): bool = all {
    qState' = {
      ready: false,
      qRoute: route,
    },
  }

  action init = all {
    qState' = {
      ready: true,
      qRoute: initialArmorClassRoute,
    },
  }

  action doSelectBarbarianUnarmoredDefense = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action doSelectBarbarianUnarmoredDefenseWithShield = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action doSelectMonkUnarmoredDefense = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action doProjectLightArmor = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action doProjectMediumArmorDexCap = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action doProjectHeavyArmorWithShield = all {
    qState.ready,
    recordRoute(selectArmorClassBaseRoute(qRoute)),
  }

  action step = any {
    doSelectBarbarianUnarmoredDefense,
    doSelectBarbarianUnarmoredDefenseWithShield,
    doSelectMonkUnarmoredDefense,
    doProjectLightArmor,
    doProjectMediumArmorDexCap,
    doProjectHeavyArmorWithShield,
  }
}
