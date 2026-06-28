// -*- mode: Bluespec; -*-

module characterCreationRouteFixtures {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"

  pure val initialDraftCreationRoute: List[CharacterCreationRouteEvent] =
    List(
      routeCreateCharacterDraft(CharacterDraftOwner),
      routeDiscoverCreationHoles(
        CreationDraftStateRouteSubject,
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CreationHoleFrontierOwner,
      ),
    )

  pure def routeApplyAndDiscoverCreationFill(
    route: List[CharacterCreationRouteEvent],
    fills: Set[CharacterCreationRouteFillFamily],
    holes: Set[CharacterCreationRouteHoleFamily],
    owner: CharacterCreationRouteOwnerGroup,
  ): List[CharacterCreationRouteEvent] =
    route
      .append(
        routeApplyCreationFillBatch(
          CreationFillBatchRouteSubject,
          fills,
          holes,
          owner,
        )
      )
      .append(
        routeDiscoverCreationHoles(
          CreationOptionDiscoveryRouteSubject,
          holes,
          CreationHoleFrontierOwner,
        )
      )

  pure val afterInitialManifestCreationRoute: List[CharacterCreationRouteEvent] =
    routeApplyAndDiscoverCreationFill(
      initialDraftCreationRoute,
      Set(CreationChoiceSetFill, CreationAbilityScoreAssignmentFill),
      Set(CreationUnitChoiceHoleFamily, CreationEquipmentSelectionHoleFamily),
      CharacterDraftOwner,
    )

  pure val completedFighterCreationRoute: List[CharacterCreationRouteEvent] =
    routeApplyAndDiscoverCreationFill(
      routeApplyAndDiscoverCreationFill(
        routeApplyAndDiscoverCreationFill(
          afterInitialManifestCreationRoute,
          Set(CreationChoiceSetFill, CreationEquipmentSelectionFill),
          Set(CreationEquipmentSelectionHoleFamily),
          CreationSupportProfileAdmissionOwner,
        ),
        Set(CreationEquipmentSelectionFill),
        Set(CreationLoadoutHoleFamily),
        CreationSupportProfileAdmissionOwner,
      ),
      Set(CreationLoadoutSelectionFill),
      Set(),
      CharacterDraftOwner,
    )
      .append(
        routeProjectCharacterBuildFacts(
          CreationBuildProjectionRouteSubject,
          CharacterBuildOwner,
        )
      )
      .append(
        routeRecordCreationFacts(
          CreationBuildProjectionRouteSubject,
          Set(
            CreationBuildProjectionInputFact,
            CreationHitPointMaximumBuildInputFact,
          ),
          CharacterBuildOwner,
        )
      )
      .append(
        routeFinalizeCharacterDraft(
          CreationFinalizationRouteSubject,
          CharacterBuildOwner,
        )
      )
}
