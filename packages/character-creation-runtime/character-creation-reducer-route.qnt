// -*- mode: Bluespec; -*-

// Executable route vocabulary for character-creation route connector drivers.
// This module describes reducer shape, not authored catalog identity.
module characterCreationReducerRoute {
  type CharacterCreationRouteSubjectFamily =
    | CreationDraftStateRouteSubject
    | CreationOptionDiscoveryRouteSubject
    | CreationFillBatchRouteSubject
    | CreationSelectedReferenceRouteSubject
    | CreationBuildProjectionRouteSubject
    | CreationFinalizationRouteSubject

  type CharacterCreationRouteHoleFamily =
    | CreationDraftStructureHoleFamily
    | CreationUnitChoiceHoleFamily
    | CreationAbilityScoreHoleFamily
    | CreationEquipmentSelectionHoleFamily
    | CreationLoadoutHoleFamily

  type CharacterCreationRouteFillFamily =
    | CreationChoiceSetFill
    | CreationAbilityScoreAssignmentFill
    | CreationEquipmentSelectionFill
    | CreationLoadoutSelectionFill

  type CharacterCreationRouteOwnerGroup =
    | CharacterDraftOwner
    | CharacterBuildOwner
    | CreationHoleFrontierOwner
    | CreationSupportProfileAdmissionOwner
    | CreationSelectedReferenceOwner

  type CharacterCreationRouteEvent =
    | RouteCreateCharacterDraft({ owner: CharacterCreationRouteOwnerGroup })
    | RouteDiscoverCreationHoles({
        subject: CharacterCreationRouteSubjectFamily,
        holes: Set[CharacterCreationRouteHoleFamily],
        owner: CharacterCreationRouteOwnerGroup,
      })
    | RouteApplyCreationFillBatch({
        subject: CharacterCreationRouteSubjectFamily,
        fills: Set[CharacterCreationRouteFillFamily],
        holes: Set[CharacterCreationRouteHoleFamily],
        owner: CharacterCreationRouteOwnerGroup,
      })
    | RouteRetainCreationSelectedReferences({
        subject: CharacterCreationRouteSubjectFamily,
        owner: CharacterCreationRouteOwnerGroup,
      })
    | RouteProjectCharacterBuildFacts({
        subject: CharacterCreationRouteSubjectFamily,
        owner: CharacterCreationRouteOwnerGroup,
      })
    | RouteFinalizeCharacterDraft({
        subject: CharacterCreationRouteSubjectFamily,
        owner: CharacterCreationRouteOwnerGroup,
      })

  pure def routeCreateCharacterDraft(
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteCreateCharacterDraft({ owner: owner })

  pure def routeDiscoverCreationHoles(
    subject: CharacterCreationRouteSubjectFamily,
    holes: Set[CharacterCreationRouteHoleFamily],
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteDiscoverCreationHoles({
      subject: subject,
      holes: holes,
      owner: owner,
    })

  pure def routeApplyCreationFillBatch(
    subject: CharacterCreationRouteSubjectFamily,
    fills: Set[CharacterCreationRouteFillFamily],
    holes: Set[CharacterCreationRouteHoleFamily],
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteApplyCreationFillBatch({
      subject: subject,
      fills: fills,
      holes: holes,
      owner: owner,
    })

  pure def routeRetainCreationSelectedReferences(
    subject: CharacterCreationRouteSubjectFamily,
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteRetainCreationSelectedReferences({
      subject: subject,
      owner: owner,
    })

  pure def routeProjectCharacterBuildFacts(
    subject: CharacterCreationRouteSubjectFamily,
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteProjectCharacterBuildFacts({
      subject: subject,
      owner: owner,
    })

  pure def routeFinalizeCharacterDraft(
    subject: CharacterCreationRouteSubjectFamily,
    owner: CharacterCreationRouteOwnerGroup,
  ): CharacterCreationRouteEvent =
    RouteFinalizeCharacterDraft({
      subject: subject,
      owner: owner,
    })
}
