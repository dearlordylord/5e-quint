// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Short Rest: a Short Rest can
//   spend Hit Point Dice and is interrupted by initiative, non-cantrip spell
//   casting, or damage.
// - .references/srd-5.2.1/Rules-Glossary.md#Long Rest: a Long Rest restores
//   HP, spent Hit Point Dice, and reduced Hit Point Maximum.
// - UBIQUITOUS_LANGUAGE.md: Short Rest, Long Rest, Hit Points, and Hit Die.
module characterSheetHpRestHitDiceRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type HpRestHitDiceRouteState = {
    replayIndex: int,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: HpRestHitDiceRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialHpRestHitDiceRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def rejectRestRoute(
    route: List[CharacterSheetRouteEvent],
    owner: CharacterSheetRouteOwnerGroup,
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeResolveCharacterSheetSubject(
        SheetRestRouteSubject,
        SheetRestDurationFill,
        Set(SheetRestBenefitChoiceHoleFamily),
        owner,
      )
    )

  pure def spendHitDiceRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeResolveCharacterSheetSubject(
        SheetHitPointRouteSubject,
        SheetHitDiceSpendFill,
        Set(),
        CharacterSheetHitDiceOwner,
      )
    )

  pure def completeShortRestWithoutBenefitsRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeCompleteCharacterSheetRest(
        SheetRestRouteSubject,
        SheetRestDurationFill,
        Set(SheetRestBenefitChoiceHoleFamily),
        CharacterSheetHitDiceOwner,
      )
    )

  pure def completeLongRestHpAndHitDiceRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeCompleteCharacterSheetRest(
          SheetRestRouteSubject,
          SheetRestDurationFill,
          Set(),
          CharacterSheetHitPointOwner,
        )
      )
      .append(
        routeCompleteCharacterSheetRest(
          SheetRestRouteSubject,
          SheetRestDurationFill,
          Set(),
          CharacterSheetHitDiceOwner,
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

  action init = recordRoute(0, initialHpRestHitDiceRoute)

  action doRejectLongRestStartAtZeroHp = all {
    qState.replayIndex == 0,
    recordRoute(1, rejectRestRoute(qRoute, CharacterSheetHitPointOwner)),
  }

  action doRejectLongRestBeforeSixteenHourWait = all {
    qState.replayIndex == 1,
    recordRoute(2, rejectRestRoute(qRoute, CharacterSheetStateOwner)),
  }

  action doSpendShortRestHitPointDie = all {
    qState.replayIndex == 2,
    recordRoute(3, spendHitDiceRoute(qRoute)),
  }

  action doInterruptShortRestNoBenefit = all {
    qState.replayIndex == 3,
    recordRoute(4, completeShortRestWithoutBenefitsRoute(qRoute)),
  }

  action doCompleteLongRestRestoresHpHitPointDiceAndMaximum = all {
    qState.replayIndex == 4,
    recordRoute(5, completeLongRestHpAndHitDiceRoute(qRoute)),
  }

  action doInterruptLongRestBeforeOneHourNoBenefit = all {
    qState.replayIndex == 5,
    recordRoute(6, completeShortRestWithoutBenefitsRoute(qRoute)),
  }

  action doInterruptLongRestWithShortRestBenefits = all {
    qState.replayIndex == 6,
    recordRoute(7, spendHitDiceRoute(qRoute)),
  }

  action doRejectShortRestStartAtZeroHp = all {
    qState.replayIndex == 7,
    recordRoute(8, rejectRestRoute(qRoute, CharacterSheetHitPointOwner)),
  }

  action doRejectShortRestDurationTooShort = all {
    qState.replayIndex == 8,
    recordRoute(9, rejectRestRoute(qRoute, CharacterSheetStateOwner)),
  }

  action doRejectLongRestDurationTooShort = all {
    qState.replayIndex == 9,
    recordRoute(10, rejectRestRoute(qRoute, CharacterSheetStateOwner)),
  }

  action doRejectLongRestPhysicalExertionTooShort = all {
    qState.replayIndex == 10,
    recordRoute(11, rejectRestRoute(qRoute, CharacterSheetStateOwner)),
  }

  action doSpendShortRestHitPointDiceSequentially = all {
    qState.replayIndex == 11,
    recordRoute(12, spendHitDiceRoute(qRoute)),
  }

  action doRejectLongRestInterruptionAtRequiredDuration = all {
    qState.replayIndex == 12,
    recordRoute(13, rejectRestRoute(qRoute, CharacterSheetStateOwner)),
  }

  action step = any {
    doRejectLongRestStartAtZeroHp,
    doRejectLongRestBeforeSixteenHourWait,
    doSpendShortRestHitPointDie,
    doInterruptShortRestNoBenefit,
    doCompleteLongRestRestoresHpHitPointDiceAndMaximum,
    doInterruptLongRestBeforeOneHourNoBenefit,
    doInterruptLongRestWithShortRestBenefits,
    doRejectShortRestStartAtZeroHp,
    doRejectShortRestDurationTooShort,
    doRejectLongRestDurationTooShort,
    doRejectLongRestPhysicalExertionTooShort,
    doSpendShortRestHitPointDiceSequentially,
    doRejectLongRestInterruptionAtRequiredDuration,
  }
}
