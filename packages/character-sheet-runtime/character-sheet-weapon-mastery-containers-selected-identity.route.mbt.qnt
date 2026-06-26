// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Equipment.md#Weapon Mastery: Weapon Mastery
//   selected weapon refs unlock mastery properties for selected weapons.
// - .references/srd-5.2.1/Rules-Glossary.md#Long Rest: Long Rest is the
//   reset boundary for features that say they recharge or change there.
// - UBIQUITOUS_LANGUAGE.md: Weapon Mastery and Mastery Property.
module characterSheetWeaponMasteryContainersSelectedIdentityRouteMbt {
  import characterSheetReducerRoute.* from "./character-sheet-reducer-route"

  type WeaponMasteryRouteState = {
    ready: bool,
    qRoute: List[CharacterSheetRouteEvent],
  }

  var qState: WeaponMasteryRouteState

  pure def qRoute: List[CharacterSheetRouteEvent] = qState.qRoute

  pure val initialWeaponMasteryRoute: List[CharacterSheetRouteEvent] =
    List(
      routeCreateCharacterSheet(CharacterSheetStateOwner),
      routeProjectCharacterSheetFacts(
        SheetBuildFactsProjectionRouteSubject,
        CharacterSheetBuildProjectionOwner,
      ),
    )

  pure def retainWeaponMasteryRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeRetainCharacterSheetSelectedReferences(
        SheetSelectedReferenceProjectionRouteSubject,
        CharacterSheetSelectedReferenceOwner,
      )
    )

  pure def reselectWeaponMasteryOnRestRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    retainWeaponMasteryRoute(route).append(
      routeCompleteCharacterSheetRest(
        SheetSelectedReferenceProjectionRouteSubject,
        SheetProjectionSelectionFill,
        Set(),
        CharacterSheetSelectedReferenceOwner,
      )
    )

  pure def rejectWeaponMasteryReselectionRoute(
    route: List[CharacterSheetRouteEvent],
  ): List[CharacterSheetRouteEvent] =
    route.append(
      routeResolveCharacterSheetSubject(
        SheetSelectedReferenceProjectionRouteSubject,
        SheetProjectionSelectionFill,
        Set(SheetProjectionChoiceHoleFamily),
        CharacterSheetSelectedReferenceOwner,
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
      qRoute: initialWeaponMasteryRoute,
    },
  }

  action doSelectPaladinWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doReselectPaladinWeaponMasteryOnLongRest = all {
    qState.ready,
    recordRoute(reselectWeaponMasteryOnRestRoute(qRoute)),
  }

  action doSelectRangerWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doReselectRangerWeaponMasteryOnLongRest = all {
    qState.ready,
    recordRoute(reselectWeaponMasteryOnRestRoute(qRoute)),
  }

  action doSelectRogueWeaponMastery = all {
    qState.ready,
    recordRoute(retainWeaponMasteryRoute(qRoute)),
  }

  action doReselectRogueWeaponMasteryOnLongRest = all {
    qState.ready,
    recordRoute(reselectWeaponMasteryOnRestRoute(qRoute)),
  }

  action doAcceptOneChangeWeaponMasteryReselection = all {
    qState.ready,
    recordRoute(reselectWeaponMasteryOnRestRoute(qRoute)),
  }

  action doRejectTooManyChangesWeaponMasteryReselection = all {
    qState.ready,
    recordRoute(rejectWeaponMasteryReselectionRoute(qRoute)),
  }

  action stepSelectPaladinWeaponMastery = any {
    doSelectPaladinWeaponMastery,
  }

  action stepReselectPaladinWeaponMasteryOnLongRest = any {
    doReselectPaladinWeaponMasteryOnLongRest,
  }

  action stepSelectRangerWeaponMastery = any {
    doSelectRangerWeaponMastery,
  }

  action stepReselectRangerWeaponMasteryOnLongRest = any {
    doReselectRangerWeaponMasteryOnLongRest,
  }

  action stepSelectRogueWeaponMastery = any {
    doSelectRogueWeaponMastery,
  }

  action stepReselectRogueWeaponMasteryOnLongRest = any {
    doReselectRogueWeaponMasteryOnLongRest,
  }

  action stepAcceptOneChangeWeaponMasteryReselection = any {
    doAcceptOneChangeWeaponMasteryReselection,
  }

  action stepRejectTooManyChangesWeaponMasteryReselection = any {
    doRejectTooManyChangesWeaponMasteryReselection,
  }

  action step = any {
    doSelectPaladinWeaponMastery,
    doReselectPaladinWeaponMasteryOnLongRest,
    doSelectRangerWeaponMastery,
    doReselectRangerWeaponMasteryOnLongRest,
    doSelectRogueWeaponMastery,
    doReselectRogueWeaponMasteryOnLongRest,
    doAcceptOneChangeWeaponMasteryReselection,
    doRejectTooManyChangesWeaponMasteryReselection,
  }
}
