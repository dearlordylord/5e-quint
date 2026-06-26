// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks: Ability Checks
//   add Proficiency Bonus when a relevant proficiency applies.
// - .references/srd-5.2.1/Playing-the-Game.md#Proficiency Bonus: a
//   Proficiency Bonus can be multiplied or divided at most once.
// - .references/srd-5.2.1/Classes/Bard.md#Level 2: Jack of All Trades:
//   half Proficiency Bonus applies to unproficient ability checks.
// - UBIQUITOUS_LANGUAGE.md: Ability Check, Proficiency Bonus, and Expertise.
module characterSheetAbilityCheckProficiencyBonusRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type AbilityCheckRouteState = {
    replayIndex: int,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: AbilityCheckRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialAbilityCheckRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def projectAbilityCheckRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeProjectCharacterSheetFacts(
        SheetAbilityCheckProjectionRouteSubject,
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

  action init = recordRoute(0, initialAbilityCheckRoute)

  action doProjectJackOfAllTradesLevelTwo = all {
    qState.replayIndex == 0,
    recordRoute(1, projectAbilityCheckRoute(qRoute)),
  }

  action doProjectJackOfAllTradesRoundedDown = all {
    qState.replayIndex == 1,
    recordRoute(2, projectAbilityCheckRoute(qRoute)),
  }

  action doProjectSkillProficiency = all {
    qState.replayIndex == 2,
    recordRoute(3, projectAbilityCheckRoute(qRoute)),
  }

  action doProjectExpertise = all {
    qState.replayIndex == 3,
    recordRoute(4, projectAbilityCheckRoute(qRoute)),
  }

  action doRejectOtherProficiencyBonus = all {
    qState.replayIndex == 4,
    recordRoute(5, projectAbilityCheckRoute(qRoute)),
  }

  action doRejectMissingBardLevelTwo = all {
    qState.replayIndex == 5,
    recordRoute(6, projectAbilityCheckRoute(qRoute)),
  }

  action step = any {
    doProjectJackOfAllTradesLevelTwo,
    doProjectJackOfAllTradesRoundedDown,
    doProjectSkillProficiency,
    doProjectExpertise,
    doRejectOtherProficiencyBonus,
    doRejectMissingBardLevelTwo,
  }
}
