// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Character-Creation.md#Fill In Numbers: Hit
//   Points and Hit Point Dice are recorded on the Character Sheet.
// - .references/srd-5.2.1/Character-Creation.md#Gaining a Level: each new
//   level adjusts Hit Points and Hit Point Dice.
// - UBIQUITOUS_LANGUAGE.md: Hit Point Maximum and Hit Die.
module characterSheetHitPointMaximumRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type HitPointMaximumRouteState = {
    replayIndex: int,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: HitPointMaximumRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialHitPointMaximumRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def projectHitPointMaximumRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeProjectCharacterSheetFacts(
          SheetHitPointRouteSubject,
          CharacterSheetHitPointOwner,
        )
      )
      .append(
        routeRecordCharacterSheetFacts(
          SheetHitPointRouteSubject,
          Set(SheetHitPointMaximumArithmeticInputFact),
          CharacterSheetBuildProjectionOwner,
        )
      )

  action recordRoute(
    replayIndex: int,
    route: List[CharacterSheetRouteEvent],
  ): bool = all {
    qState' = {
      replayIndex: replayIndex,
      qRoute: route,
    },
  }

  action init = recordRoute(0, initialHitPointMaximumRoute)

  action doProjectFighterLevelOne = all {
    qState.replayIndex == 0,
    recordRoute(1, projectHitPointMaximumRoute(qRoute)),
  }

  action doProjectFighterLevelTwo = all {
    qState.replayIndex == 1,
    recordRoute(2, projectHitPointMaximumRoute(qRoute)),
  }

  action doProjectWizardFighterMulticlass = all {
    qState.replayIndex == 2,
    recordRoute(3, projectHitPointMaximumRoute(qRoute)),
  }

  action doProjectMinimumHigherLevelGain = all {
    qState.replayIndex == 3,
    recordRoute(4, projectHitPointMaximumRoute(qRoute)),
  }

  action doProjectSorcererDraconicResilience = all {
    qState.replayIndex == 4,
    recordRoute(5, projectHitPointMaximumRoute(qRoute)),
  }

  action doProjectReducedEffectiveMaximum = all {
    qState.replayIndex == 5,
    recordRoute(6, projectHitPointMaximumRoute(qRoute)),
  }

  action step = any {
    doProjectFighterLevelOne,
    doProjectFighterLevelTwo,
    doProjectWizardFighterMulticlass,
    doProjectMinimumHigherLevelGain,
    doProjectSorcererDraconicResilience,
    doProjectReducedEffectiveMaximum,
  }
}
