// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Character-Creation.md#Record Class Features:
//   class feature choices are retained on the Character Sheet.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Always-Prepared
//   Spells: class features can project prepared Spell Access.
// - Level-3 subclass spell projections use the same selected-reference
//   projection route as lower-level class-feature projections.
module characterSheetClassFeatureSelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type ClassFeatureRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: ClassFeatureRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialClassFeatureRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def projectClassFeatureSelectedReferenceRoute(
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
          SheetSelectedReferenceProjectionRouteSubject,
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
      qRoute: initialClassFeatureRoute,
    },
  }

  action doProjectBardJackOfAllTrades = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectClericLifeDomainSpells = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectDruidCircleLandSpells = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectPaladinOathDevotionSpells = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectPaladinsSmite = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectRangerFavoredEnemy = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectSorcererDraconicSpells = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action doProjectWarlockFiendSpells = all {
    qState.ready,
    recordRoute(projectClassFeatureSelectedReferenceRoute(qRoute)),
  }

  action stepProjectBardJackOfAllTrades = any {
    doProjectBardJackOfAllTrades,
  }

  action stepProjectClericLifeDomainSpells = any {
    doProjectClericLifeDomainSpells,
  }

  action stepProjectDruidCircleLandSpells = any {
    doProjectDruidCircleLandSpells,
  }

  action stepProjectPaladinOathDevotionSpells = any {
    doProjectPaladinOathDevotionSpells,
  }

  action stepProjectPaladinsSmite = any {
    doProjectPaladinsSmite,
  }

  action stepProjectRangerFavoredEnemy = any {
    doProjectRangerFavoredEnemy,
  }

  action stepProjectSorcererDraconicSpells = any {
    doProjectSorcererDraconicSpells,
  }

  action stepProjectWarlockFiendSpells = any {
    doProjectWarlockFiendSpells,
  }

  action step = any {
    doProjectBardJackOfAllTrades,
    doProjectClericLifeDomainSpells,
    doProjectDruidCircleLandSpells,
    doProjectPaladinOathDevotionSpells,
    doProjectPaladinsSmite,
    doProjectRangerFavoredEnemy,
    doProjectSorcererDraconicSpells,
    doProjectWarlockFiendSpells,
  }
}
