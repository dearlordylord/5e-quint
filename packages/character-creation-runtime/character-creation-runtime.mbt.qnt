// -*- mode: Bluespec; -*-

module characterCreationRuntimeMbt {
  import characterCreationRuntimeSlice.* from "./character-creation-runtime-slice"

  type FillIssueProjection = {
    fillIndex: int,
    hole: HoleId,
    code: str,
  }

  type CreationRuntimeOutcome =
    | CreationInit
    | CreationAccepted
    | CreationRejected

  type CreationRuntimeWitnessState = {
    draft: Draft,
    openHoles: Set[HoleId],
    finalization: FinalizationStatus,
    outcome: CreationRuntimeOutcome,
    batchIssueCodes: Set[str],
    fillIssues: Set[FillIssueProjection],
  }

  var qState: CreationRuntimeWitnessState

  pure def draft: Draft = qState.draft
  pure def openHoles: Set[HoleId] = qState.openHoles
  pure def finalization: FinalizationStatus = qState.finalization
  pure def outcome: CreationRuntimeOutcome = qState.outcome
  pure def batchIssueCodes: Set[str] = qState.batchIssueCodes
  pure def fillIssues: Set[FillIssueProjection] = qState.fillIssues

  pure val initialChoicesOnlyFills: List[Fill] = [
    FChoice({ hole: HProgression, options: [OClassFighterLevel1] }),
    FChoice({ hole: HBackground, options: [OBackgroundSoldier] }),
    FChoice({ hole: HSpecies, options: [OSpeciesOrc] }),
    FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
    FChoice({ hole: HAlignment, options: [OAlignmentLawfulGood] }),
  ]

  pure val abilityScoresOnlyFills: List[Fill] = [
    FAbilityScores({
      hole: HAbilityScores,
      method: StandardArray,
      scores: fighterStandardArray,
    }),
  ]

  pure val duplicateLanguageHoleFills: List[Fill] = [
    FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
    FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
  ]

  pure val closedInitialProgressionHoleFills: List[Fill] = [
    FChoice({ hole: HProgression, options: [OClassFighterLevel1] }),
  ]

  pure val staleExpectedRevision: int = 999

  pure def resultDraft(result: FillBatchResult): Draft = match result {
    | Accepted(v) => v.draft
    | Rejected(v) => v.draft
  }

  pure def resultHoles(result: FillBatchResult): Set[HoleId] = match result {
    | Accepted(v) => v.holes
    | Rejected(v) => v.holes
  }

  pure def resultFinalization(result: FillBatchResult): FinalizationStatus = match result {
    | Accepted(v) => v.finalization
    | Rejected(v) => v.finalization
  }

  pure def resultOutcome(result: FillBatchResult): CreationRuntimeOutcome = match result {
    | Accepted(_) => CreationAccepted
    | Rejected(_) => CreationRejected
  }

  pure def fillIssueCodeName(code: FillIssueCode): str = match code {
    | UnknownHole => "unknownHole"
    | DuplicateFill => "duplicateFill"
    | WrongFillKind => "wrongFillKind"
    | InvalidChoice => "invalidChoice"
    | InvalidAbilityScores => "invalidAbilityScores"
    | TooFewChoices => "tooFewChoices"
    | TooManyChoices => "tooManyChoices"
    | UnsupportedChoice => "unsupportedChoice"
  }

  pure def batchIssueCodeName(code: BatchIssueCode): str = match code {
    | StaleRevision => "staleRevision"
  }

  pure def resultBatchIssueCodes(result: FillBatchResult): Set[str] = match result {
    | Accepted(_) => Set()
    | Rejected(v) =>
        v.issues.batch.map(batchIssueCodeName)
  }

  pure def projectFillIssue(issue: FillIssue): FillIssueProjection =
    {
      fillIndex: issue.fillIndex,
      hole: issue.hole,
      code: fillIssueCodeName(issue.code),
    }

  pure def resultFillIssues(result: FillBatchResult): Set[FillIssueProjection] = match result {
    | Accepted(_) => Set()
    | Rejected(v) =>
        v.issues.fills.map(projectFillIssue)
  }

  action recordResult(result: FillBatchResult): bool = all {
    qState' = {
      draft: resultDraft(result),
      openHoles: resultHoles(result),
      finalization: resultFinalization(result),
      outcome: resultOutcome(result),
      batchIssueCodes: resultBatchIssueCodes(result),
      fillIssues: resultFillIssues(result),
    },
  }

  action init = all {
    qState' = {
      draft: emptyDraft,
      openHoles: openCreationHoles(emptyDraft),
      finalization: finalizeDraft(emptyDraft),
      outcome: CreationInit,
      batchIssueCodes: Set(),
      fillIssues: Set(),
    },
  }

  action doFillInitialManifest =
    all {
      openHoles == initialHoleIds,
      recordResult(fillCreationHoles(draft, draft.revision, initialManifestFills)),
    }

  action doFillInitialChoicesOnly =
    all {
      openHoles.contains(HProgression),
      openHoles.contains(HBackground),
      openHoles.contains(HSpecies),
      openHoles.contains(HLanguages),
      openHoles.contains(HAlignment),
      recordResult(fillCreationHoles(draft, draft.revision, initialChoicesOnlyFills)),
    }

  action doFillAbilityScoresOnly =
    all {
      openHoles.contains(HAbilityScores),
      recordResult(fillCreationHoles(draft, draft.revision, abilityScoresOnlyFills)),
    }

  action doFillManifestChoices =
    all {
      openHoles == afterInitialHoleIds,
      recordResult(fillCreationHoles(draft, draft.revision, manifestChoiceFills)),
    }

  action doFillManifestPurchase =
    all {
      openHoles == Set(HEquipmentPurchase),
      recordResult(fillCreationHoles(draft, draft.revision, manifestPurchaseFills)),
    }

  action doFillManifestLoadout =
    all {
      openHoles == Set(HLoadoutArmor, HLoadoutShield, HLoadoutWeapon),
      recordResult(fillCreationHoles(draft, draft.revision, manifestLoadoutFills)),
    }

  action doRejectStaleInitialManifest =
    all {
      openHoles == initialHoleIds,
      recordResult(fillCreationHoles(draft, staleExpectedRevision, initialManifestFills)),
    }

  action doRejectUnsupportedLanguage =
    all {
      openHoles.contains(HLanguages),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageElvish] }),
      ])),
    }

  action doRejectDuplicateLanguage =
    all {
      openHoles.contains(HLanguages),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageDwarvish] }),
      ])),
    }

  action doRejectDuplicateFill =
    all {
      openHoles.contains(HLanguages),
      recordResult(fillCreationHoles(draft, draft.revision, duplicateLanguageHoleFills)),
    }

  action doRejectTooFewLanguages =
    all {
      openHoles.contains(HLanguages),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish] }),
      ])),
    }

  action doRejectTooManyLanguages =
    all {
      openHoles.contains(HLanguages),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin, OLanguageElvish] }),
      ])),
    }

  action doRejectWrongKindPrimaryClass =
    all {
      openHoles.contains(HProgression),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FAbilityScores({
          hole: HProgression,
          method: StandardArray,
          scores: fighterStandardArray,
        }),
      ])),
    }

  action doRejectClosedInitialProgressionHole =
    all {
      not(openHoles.contains(HProgression)),
      recordResult(fillCreationHoles(draft, draft.revision, closedInitialProgressionHoleFills)),
    }

  action doRejectUnknownLoadoutArmor =
    all {
      not(openHoles.contains(HLoadoutArmor)),
      not(draft.equipmentPurchase),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HLoadoutArmor, options: [OLoadoutWorn] }),
      ])),
    }

  action doRejectUnsupportedClassEquipment =
    all {
      openHoles.contains(HClassEquipment),
      recordResult(fillCreationHoles(draft, draft.revision, [
        FChoice({ hole: HClassEquipment, options: [OClassEquipmentPackageA] }),
      ])),
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

  pure def draftFillCount(draft: Draft): int =
    (if (hasProgression(draft)) 1 else 0)
      + (if (draft.background) 1 else 0)
      + (if (draft.species) 1 else 0)
      + (if (draft.abilityScores) 1 else 0)
      + (if (draft.languages) 1 else 0)
      + (if (draft.alignment) 1 else 0)
      + (if (draft.classSkills) 1 else 0)
      + (if (draft.fighterFightingStyle) 1 else 0)
      + (if (draft.fighterWeaponMastery) 1 else 0)
      + (if (draft.backgroundAbilityScoreIncrease) 1 else 0)
      + (if (draft.backgroundTool) 1 else 0)
      + (if (draft.classEquipment) 1 else 0)
      + (if (draft.backgroundEquipment) 1 else 0)
      + (if (draft.equipmentPurchase) 1 else 0)
      + (if (draft.loadoutArmor) 1 else 0)
      + (if (draft.loadoutShield) 1 else 0)
      + (if (draft.loadoutWeapon) 1 else 0)

  pure def draftPrerequisitesHold(draft: Draft): bool =
    (draft.classSkills implies hasProgression(draft))
      and (draft.fighterFightingStyle implies hasFighterProgression(draft))
      and (draft.fighterWeaponMastery implies hasFighterProgression(draft))
      and (draft.classEquipment implies hasProgression(draft))
      and (draft.backgroundAbilityScoreIncrease implies draft.background)
      and (draft.backgroundTool implies draft.background)
      and (draft.backgroundEquipment implies draft.background)
      and (draft.equipmentPurchase implies draft.classEquipment and draft.backgroundEquipment)
      and (draft.loadoutArmor implies draft.equipmentPurchase)
      and (draft.loadoutShield implies draft.equipmentPurchase)
      and (draft.loadoutWeapon implies draft.equipmentPurchase)

  pure def draftReadyFieldsHold(draft: Draft): bool =
    hasProgression(draft)
      and draft.background
      and draft.species
      and draft.abilityScores
      and draft.languages
      and draft.alignment
      and draft.classSkills
      and (
        (hasFighterProgression(draft) and draft.fighterFightingStyle and draft.fighterWeaponMastery)
        or hasWizardProgression(draft)
      )
      and draft.backgroundAbilityScoreIncrease
      and draft.backgroundTool
      and draft.classEquipment
      and draft.backgroundEquipment
      and draft.equipmentPurchase
      and draft.loadoutArmor
      and draft.loadoutShield
      and draft.loadoutWeapon

  val invariant =
    draft.revision >= 0
      and draft.revision <= 5
      and draft.revision <= draftFillCount(draft)
      and (outcome == CreationInit implies draft == emptyDraft)
      and draftPrerequisitesHold(draft)
      and openHoles == openCreationHoles(draft)
      and finalization == finalizeDraft(draft)
      and ((finalization == Ready) == draftReadyFieldsHold(draft))
      and ((finalization == Ready) == (openHoles == Set()))
      and (outcome != CreationRejected implies batchIssueCodes == Set())
      and (outcome != CreationRejected implies fillIssues == Set())
}
