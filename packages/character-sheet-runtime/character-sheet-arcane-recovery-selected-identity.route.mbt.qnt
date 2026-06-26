// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Classes/Wizard.md#Level 1: Arcane Recovery:
//   Arcane Recovery recovers expended ordinary Spell Slots after a Short Rest
//   and resets on a Long Rest.
// - L15-RR11-LEVEL3-4-SCOPE-PROMOTION owns the second-level slot branch.
module characterSheetArcaneRecoverySelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type ArcaneRecoveryRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: ArcaneRecoveryRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialArcaneRecoveryRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def resetArcaneRecoveryRoute(
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

  pure def rejectPactSlotArcaneRecoveryRoute(
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
      qRoute: initialArcaneRecoveryRoute,
    },
  }

  action doResetArcaneRecoveryOnLongRest = all {
    qState.ready,
    recordRoute(resetArcaneRecoveryRoute(qRoute)),
  }

  action doRecoverSecondLevelSpellSlot = all {
    qState.ready,
    recordRoute(resetArcaneRecoveryRoute(qRoute)),
  }

  action doRejectPactSlotArcaneRecovery = all {
    qState.ready,
    recordRoute(rejectPactSlotArcaneRecoveryRoute(qRoute)),
  }

  action step = any {
    doRecoverSecondLevelSpellSlot,
    doResetArcaneRecoveryOnLongRest,
    doRejectPactSlotArcaneRecovery,
  }
}
