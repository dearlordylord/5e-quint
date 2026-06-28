// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Paladin.md#Level 1: Lay On Hands:
//   Lay On Hands spends one healing pool to restore Hit Points and remove
//   Poisoned.
// - UBIQUITOUS_LANGUAGE.md: Pool, Spend, Hit Points, and Condition.
module characterSheetHealingResourceSelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type HealingResourceRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: HealingResourceRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialHealingResourceRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def spendHealingResourceRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeResolveCharacterSheetSubject(
          SheetFeatureResourceRouteSubject,
          SheetResourceSpendFill,
          Set(),
          CharacterSheetFeatureResourceOwner,
        )
      )
      .append(
        routeProjectCharacterSheetFacts(
          SheetHitPointRouteSubject,
          CharacterSheetHitPointOwner,
        )
      )
      .append(
        routeRecordCharacterSheetFacts(
          SheetFeatureResourceRouteSubject,
          Set(SheetFeatureResourceSpendFact),
          CharacterSheetFeatureResourceOwner,
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
      qRoute: initialHealingResourceRoute,
    },
  }

  action doLayOnHandsRestoreHpAndRemovePoisoned = all {
    qState.ready,
    recordRoute(spendHealingResourceRoute(qRoute)),
  }

  action step = any {
    doLayOnHandsRestoreHpAndRemovePoisoned,
  }
}
