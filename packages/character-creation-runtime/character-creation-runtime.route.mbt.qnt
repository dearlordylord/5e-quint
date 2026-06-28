// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Character-Creation.md#Record Class Features:
//   class features can offer choices during character creation.
// - .references/srd-5.2.1/Character-Creation.md#Gaining a Level: new class
//   features can offer choices during level advancement.
// - packages/character-creation-runtime/VOCABULARY.md: Character Draft,
//   Creation Hole, Creation Fill, Support Profile, and Finalization Gate.
// - UBIQUITOUS_LANGUAGE.md: Proficiency, Ability Scores, Equipment, and Spell
//   Ownership Terms.
module characterCreationRuntimeRouteMbt {
  import characterCreationReducerRoute.* from "./character-creation-reducer-route"

  type RuntimeRouteStage =
    | RuntimeDraftOpen
    | RuntimeInitialManifestFilled
    | RuntimeInitialChoicesFilled
    | RuntimeAbilityScoresFilled
    | RuntimeManifestChoicesFilled
    | RuntimePurchaseFilled
    | RuntimeFinalized
    | RuntimeRejected

  type RuntimeRouteState = {
    stage: RuntimeRouteStage,
    qRoute: List[CharacterCreationRouteEvent],
  }

  var qState: RuntimeRouteState

  pure def qRoute: List[CharacterCreationRouteEvent] = qState.qRoute

  pure val initialDraftRoute: List[CharacterCreationRouteEvent] =
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

  pure def applyFillBatchRoute(
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

  pure def recordCreationFactsRoute(
    route: List[CharacterCreationRouteEvent],
    subject: CharacterCreationRouteSubjectFamily,
    facts: Set[CharacterCreationRouteFactFamily],
    owner: CharacterCreationRouteOwnerGroup,
  ): List[CharacterCreationRouteEvent] =
    route.append(routeRecordCreationFacts(subject, facts, owner))

  pure def finalizeRoute(
    route: List[CharacterCreationRouteEvent],
  ): List[CharacterCreationRouteEvent] =
    route
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

  pure def stageHoleFamilies(
    stage: RuntimeRouteStage,
  ): Set[CharacterCreationRouteHoleFamily] = match stage {
    | RuntimeDraftOpen =>
        Set(CreationDraftStructureHoleFamily, CreationAbilityScoreHoleFamily)
    | RuntimeInitialManifestFilled =>
        Set(CreationUnitChoiceHoleFamily, CreationEquipmentSelectionHoleFamily)
    | RuntimeInitialChoicesFilled =>
        Set(
          CreationAbilityScoreHoleFamily,
          CreationUnitChoiceHoleFamily,
          CreationEquipmentSelectionHoleFamily,
        )
    | RuntimeAbilityScoresFilled =>
        Set(CreationDraftStructureHoleFamily)
    | RuntimeManifestChoicesFilled =>
        Set(CreationEquipmentSelectionHoleFamily)
    | RuntimePurchaseFilled =>
        Set(CreationLoadoutHoleFamily)
    | RuntimeFinalized =>
        Set()
    | RuntimeRejected =>
        Set()
  }

  action recordRoute(
    stage: RuntimeRouteStage,
    route: List[CharacterCreationRouteEvent],
  ): bool = all {
    qState' = {
      stage: stage,
      qRoute: route,
    },
  }

  action init =
    recordRoute(RuntimeDraftOpen, initialDraftRoute)

  action doFillInitialManifest = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeInitialManifestFilled,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill, CreationAbilityScoreAssignmentFill),
        Set(CreationUnitChoiceHoleFamily, CreationEquipmentSelectionHoleFamily),
        CharacterDraftOwner,
      ),
    ),
  }

  action doFillInitialChoicesOnly = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeInitialChoicesFilled,
      recordCreationFactsRoute(
        applyFillBatchRoute(
          qRoute,
          Set(CreationChoiceSetFill),
          Set(
            CreationAbilityScoreHoleFamily,
            CreationUnitChoiceHoleFamily,
            CreationEquipmentSelectionHoleFamily,
          ),
          CharacterDraftOwner,
        ),
        CreationDraftStateRouteSubject,
        Set(CreationPartialFillDraftFact),
        CharacterDraftOwner,
      ),
    ),
  }

  action doFillAbilityScoresOnly = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeAbilityScoresFilled,
      recordCreationFactsRoute(
        applyFillBatchRoute(
          qRoute,
          Set(CreationAbilityScoreAssignmentFill),
          Set(CreationDraftStructureHoleFamily),
          CharacterDraftOwner,
        ),
        CreationDraftStateRouteSubject,
        Set(CreationPartialFillDraftFact),
        CharacterDraftOwner,
      ),
    ),
  }

  action doFillManifestChoices = all {
    qState.stage == RuntimeInitialManifestFilled,
    recordRoute(
      RuntimeManifestChoicesFilled,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill, CreationEquipmentSelectionFill),
        Set(CreationEquipmentSelectionHoleFamily),
        CreationSupportProfileAdmissionOwner,
      ),
    ),
  }

  action doFillManifestPurchase = all {
    qState.stage == RuntimeManifestChoicesFilled,
    recordRoute(
      RuntimePurchaseFilled,
      applyFillBatchRoute(
        qRoute,
        Set(CreationEquipmentSelectionFill),
        Set(CreationLoadoutHoleFamily),
        CreationSupportProfileAdmissionOwner,
      ),
    ),
  }

  action doFillManifestLoadout = all {
    qState.stage == RuntimePurchaseFilled,
    recordRoute(
      RuntimeFinalized,
      finalizeRoute(
        applyFillBatchRoute(
          qRoute,
          Set(CreationLoadoutSelectionFill),
          Set(),
          CharacterDraftOwner,
        )
      ),
    ),
  }

  action doRejectStaleInitialManifest = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      recordCreationFactsRoute(
        applyFillBatchRoute(
          qRoute,
          Set(CreationChoiceSetFill, CreationAbilityScoreAssignmentFill),
          Set(
            CreationDraftStructureHoleFamily,
            CreationAbilityScoreHoleFamily,
          ),
          CharacterDraftOwner,
        ),
        CreationFillBatchRouteSubject,
        Set(CreationStaleFillRejectionFact),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectUnsupportedLanguage = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CreationSupportProfileAdmissionOwner,
      ),
    ),
  }

  action doRejectDuplicateLanguage = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectDuplicateFill = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectTooFewLanguages = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectTooManyLanguages = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectWrongKindPrimaryClass = all {
    qState.stage == RuntimeDraftOpen,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationAbilityScoreAssignmentFill),
        Set(
          CreationDraftStructureHoleFamily,
          CreationAbilityScoreHoleFamily,
        ),
        CharacterDraftOwner,
      ),
    ),
  }

  action doRejectClosedInitialProgressionHole = all {
    qState.stage != RuntimeDraftOpen,
    qState.stage != RuntimeRejected,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationChoiceSetFill),
        stageHoleFamilies(qState.stage),
        CreationHoleFrontierOwner,
      ),
    ),
  }

  action doRejectUnknownLoadoutArmor = all {
    qState.stage != RuntimePurchaseFilled,
    qState.stage != RuntimeRejected,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationLoadoutSelectionFill),
        stageHoleFamilies(qState.stage),
        CreationHoleFrontierOwner,
      ),
    ),
  }

  action doRejectUnsupportedClassEquipment = all {
    qState.stage == RuntimeInitialManifestFilled,
    recordRoute(
      RuntimeRejected,
      applyFillBatchRoute(
        qRoute,
        Set(CreationEquipmentSelectionFill),
        Set(CreationUnitChoiceHoleFamily, CreationEquipmentSelectionHoleFamily),
        CreationSupportProfileAdmissionOwner,
      ),
    ),
  }

  action step = any {
    doFillInitialManifest,
    doFillInitialChoicesOnly,
    doFillAbilityScoresOnly,
    doFillManifestChoices,
    doFillManifestPurchase,
    doFillManifestLoadout,
    doRejectStaleInitialManifest,
    doRejectUnsupportedLanguage,
    doRejectDuplicateLanguage,
    doRejectDuplicateFill,
    doRejectTooFewLanguages,
    doRejectTooManyLanguages,
    doRejectWrongKindPrimaryClass,
    doRejectClosedInitialProgressionHole,
    doRejectUnknownLoadoutArmor,
    doRejectUnsupportedClassEquipment,
  }
}
