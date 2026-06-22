// -*- mode: Bluespec; -*-

// Executable route vocabulary for character-sheet route connector drivers. This
// module describes reducer shape, not authored catalog identity.
module characterSheetReducerRoute {
  type CharacterSheetRouteSubjectFamily =
    | SheetStateRouteSubject
    | SheetHitPointRouteSubject
    | SheetRestRouteSubject
    | SheetFeatureResourceRouteSubject
    | SheetSpellResourceRouteSubject
    | SheetBuildFactsProjectionRouteSubject
    | SheetArmorClassProjectionRouteSubject
    | SheetAbilityCheckProjectionRouteSubject
    | SheetSelectedReferenceProjectionRouteSubject

  type CharacterSheetRouteHoleFamily =
    | SheetHitDiceSpendHoleFamily
    | SheetRestBenefitChoiceHoleFamily
    | SheetResourceSpendHoleFamily
    | SheetRecoveryChoiceHoleFamily
    | SheetProjectionChoiceHoleFamily

  type CharacterSheetRouteFillFamily =
    | SheetHitDiceSpendFill
    | SheetRestDurationFill
    | SheetResourceSpendFill
    | SheetRecoverySelectionFill
    | SheetProjectionSelectionFill

  type CharacterSheetRouteOwnerGroup =
    | CharacterSheetStateOwner
    | CharacterSheetHitPointOwner
    | CharacterSheetHitDiceOwner
    | CharacterSheetSpellSlotOwner
    | CharacterSheetPactSlotOwner
    | CharacterSheetFeatureResourceOwner
    | CharacterSheetBuildProjectionOwner
    | CharacterSheetSelectedReferenceOwner

  type CharacterSheetRouteEvent =
    | RouteCreateCharacterSheet({ owner: CharacterSheetRouteOwnerGroup })
    | RouteProjectCharacterSheetFacts({
        subject: CharacterSheetRouteSubjectFamily,
        owner: CharacterSheetRouteOwnerGroup,
      })
    | RouteRetainCharacterSheetSelectedReferences({
        subject: CharacterSheetRouteSubjectFamily,
        owner: CharacterSheetRouteOwnerGroup,
      })
    | RouteResolveCharacterSheetSubject({
        subject: CharacterSheetRouteSubjectFamily,
        fill: CharacterSheetRouteFillFamily,
        holes: Set[CharacterSheetRouteHoleFamily],
        owner: CharacterSheetRouteOwnerGroup,
      })
    | RouteCompleteCharacterSheetRest({
        subject: CharacterSheetRouteSubjectFamily,
        fill: CharacterSheetRouteFillFamily,
        holes: Set[CharacterSheetRouteHoleFamily],
        owner: CharacterSheetRouteOwnerGroup,
      })

  pure def routeCreateCharacterSheet(
    owner: CharacterSheetRouteOwnerGroup,
  ): CharacterSheetRouteEvent =
    RouteCreateCharacterSheet({ owner: owner })

  pure def routeProjectCharacterSheetFacts(
    subject: CharacterSheetRouteSubjectFamily,
    owner: CharacterSheetRouteOwnerGroup,
  ): CharacterSheetRouteEvent =
    RouteProjectCharacterSheetFacts({
      subject: subject,
      owner: owner,
    })

  pure def routeRetainCharacterSheetSelectedReferences(
    subject: CharacterSheetRouteSubjectFamily,
    owner: CharacterSheetRouteOwnerGroup,
  ): CharacterSheetRouteEvent =
    RouteRetainCharacterSheetSelectedReferences({
      subject: subject,
      owner: owner,
    })

  pure def routeResolveCharacterSheetSubject(
    subject: CharacterSheetRouteSubjectFamily,
    fill: CharacterSheetRouteFillFamily,
    holes: Set[CharacterSheetRouteHoleFamily],
    owner: CharacterSheetRouteOwnerGroup,
  ): CharacterSheetRouteEvent =
    RouteResolveCharacterSheetSubject({
      subject: subject,
      fill: fill,
      holes: holes,
      owner: owner,
    })

  pure def routeCompleteCharacterSheetRest(
    subject: CharacterSheetRouteSubjectFamily,
    fill: CharacterSheetRouteFillFamily,
    holes: Set[CharacterSheetRouteHoleFamily],
    owner: CharacterSheetRouteOwnerGroup,
  ): CharacterSheetRouteEvent =
    RouteCompleteCharacterSheetRest({
      subject: subject,
      fill: fill,
      holes: holes,
      owner: owner,
    })
}
