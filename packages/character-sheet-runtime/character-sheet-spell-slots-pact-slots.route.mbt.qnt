// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots:
//   Long Rest restores expended Spell Slots.
// - .references/srd-5.2.1/Classes/Warlock.md#Level 1: Pact Magic: Pact
//   Slots recover on a Short or Long Rest.
// - Second-level Arcane Recovery slot branches use the existing Spell Slot and
//   Pact Slot recovery route owners.
module characterSheetSpellSlotsPactSlotsRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type SpellResourceRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: SpellResourceRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialSpellResourceRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def rejectSpellResourceRoute(
    route: List[CharacterSheetRouteEvent],
    owner: CharacterSheetRouteOwnerGroup,
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeResolveCharacterSheetSubject(
        SheetSpellResourceRouteSubject,
        SheetResourceSpendFill,
        Set(SheetResourceSpendHoleFamily),
        owner,
      )
    )

  pure def completeRestoredSlotRoute(
    route: List[CharacterSheetRouteEvent],
    owner: CharacterSheetRouteOwnerGroup,
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeCompleteCharacterSheetRest(
        SheetSpellResourceRouteSubject,
        SheetRestDurationFill,
        Set(),
        owner,
      )
    )

  pure def completeLongRestSpellResourceRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    completeRestoredSlotRoute(
      completeRestoredSlotRoute(route, CharacterSheetSpellSlotOwner),
      CharacterSheetPactSlotOwner,
    )

  pure def noSlotBenefitRestRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeCompleteCharacterSheetRest(
        SheetRestRouteSubject,
        SheetRestDurationFill,
        Set(SheetRestBenefitChoiceHoleFamily),
        CharacterSheetSpellSlotOwner,
      )
    )

  pure def pactSlotRecoveryRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route
      .append(
        routeResolveCharacterSheetSubject(
          SheetFeatureResourceRouteSubject,
          SheetRecoverySelectionFill,
          Set(),
          CharacterSheetFeatureResourceOwner,
        )
      )
      .append(
        routeResolveCharacterSheetSubject(
          SheetSpellResourceRouteSubject,
          SheetRecoverySelectionFill,
          Set(),
          CharacterSheetPactSlotOwner,
        )
      )

  pure def arcaneRecoverySpellSlotRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeCompleteCharacterSheetRest(
        SheetSpellResourceRouteSubject,
        SheetRecoverySelectionFill,
        Set(),
        CharacterSheetSpellSlotOwner,
      )
    )

  pure def rejectPactSlotRecoveryRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeResolveCharacterSheetSubject(
        SheetSpellResourceRouteSubject,
        SheetRecoverySelectionFill,
        Set(SheetRecoveryChoiceHoleFamily),
        CharacterSheetPactSlotOwner,
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
      qRoute: initialSpellResourceRoute,
    },
  }

  action doRejectMismatchedOrdinarySpellSlotCapacity = all {
    qState.ready,
    recordRoute(rejectSpellResourceRoute(qRoute, CharacterSheetSpellSlotOwner)),
  }

  action doRejectPactSlotExpenditureOverCapacity = all {
    qState.ready,
    recordRoute(rejectSpellResourceRoute(qRoute, CharacterSheetPactSlotOwner)),
  }

  action doShortRestRestoresPactSlotsOnly = all {
    qState.ready,
    recordRoute(completeRestoredSlotRoute(qRoute, CharacterSheetPactSlotOwner)),
  }

  action doShortRestArcaneRecoveryRefundsOrdinarySpellSlot = all {
    qState.ready,
    recordRoute(arcaneRecoverySpellSlotRoute(qRoute)),
  }

  action doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots = all {
    qState.ready,
    recordRoute(completeLongRestSpellResourceRoute(qRoute)),
  }

  action doInterruptShortRestNoSlotBenefit = all {
    qState.ready,
    recordRoute(noSlotBenefitRestRoute(qRoute)),
  }

  action doInterruptLongRestBeforeOneHourNoSlotBenefit = all {
    qState.ready,
    recordRoute(noSlotBenefitRestRoute(qRoute)),
  }

  action doInterruptLongRestWithShortRestSlotBenefits = all {
    qState.ready,
    recordRoute(completeRestoredSlotRoute(qRoute, CharacterSheetPactSlotOwner)),
  }

  action doMagicalCunningRecoversPactSlots = all {
    qState.ready,
    recordRoute(pactSlotRecoveryRoute(qRoute)),
  }

  action doRejectMagicalCunningWithoutExpendedPactSlots = all {
    qState.ready,
    recordRoute(rejectPactSlotRecoveryRoute(qRoute)),
  }

  action doRejectArcaneRecoveryPactSlotRefund = all {
    qState.ready,
    recordRoute(rejectPactSlotRecoveryRoute(qRoute)),
  }

  action step = any {
    doRejectMismatchedOrdinarySpellSlotCapacity,
    doRejectPactSlotExpenditureOverCapacity,
    doShortRestRestoresPactSlotsOnly,
    doShortRestArcaneRecoveryRefundsOrdinarySpellSlot,
    doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots,
    doInterruptShortRestNoSlotBenefit,
    doInterruptLongRestBeforeOneHourNoSlotBenefit,
    doInterruptLongRestWithShortRestSlotBenefits,
    doMagicalCunningRecoversPactSlots,
    doRejectMagicalCunningWithoutExpendedPactSlots,
    doRejectArcaneRecoveryPactSlotRefund,
  }
}
