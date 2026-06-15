// -*- mode: Bluespec; -*-

module characterCreationRuntimeMbt {
  import characterCreationRuntimeSlice.* from "./character-creation-runtime-slice"

  var qDraft: Draft
  var qHoles: Set[HoleId]
  var qFinalization: FinalizationStatus
  var qLastResult: str
  var qLastBatchIssueCodes: Set[str]
  var qLastFillIssues: Set[FillIssueProjection]

  type FillIssueProjection = {
    fillIndex: int,
    hole: HoleId,
    code: str,
  }

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

  pure def resultTag(result: FillBatchResult): str = match result {
    | Accepted(_) => "accepted"
    | Rejected(_) => "rejected"
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
    qDraft' = resultDraft(result),
    qHoles' = resultHoles(result),
    qFinalization' = resultFinalization(result),
    qLastResult' = resultTag(result),
    qLastBatchIssueCodes' = resultBatchIssueCodes(result),
    qLastFillIssues' = resultFillIssues(result),
  }

  action init = all {
    qDraft' = emptyDraft,
    qHoles' = openCreationHoles(emptyDraft),
    qFinalization' = finalizeDraft(emptyDraft),
    qLastResult' = "init",
    qLastBatchIssueCodes' = Set(),
    qLastFillIssues' = Set(),
  }

  action doFillInitialManifest =
    all {
      qHoles == initialHoleIds,
      recordResult(fillCreationHoles(qDraft, qDraft.revision, initialManifestFills)),
    }

  action doFillInitialChoicesOnly =
    all {
      qHoles.contains(HProgression),
      qHoles.contains(HBackground),
      qHoles.contains(HSpecies),
      qHoles.contains(HLanguages),
      qHoles.contains(HAlignment),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, initialChoicesOnlyFills)),
    }

  action doFillAbilityScoresOnly =
    all {
      qHoles.contains(HAbilityScores),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, abilityScoresOnlyFills)),
    }

  action doFillManifestChoices =
    all {
      qHoles == afterInitialHoleIds,
      recordResult(fillCreationHoles(qDraft, qDraft.revision, manifestChoiceFills)),
    }

  action doFillManifestPurchase =
    all {
      qHoles == Set(HEquipmentPurchase),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, manifestPurchaseFills)),
    }

  action doFillManifestLoadout =
    all {
      qHoles == Set(HLoadoutArmor, HLoadoutShield, HLoadoutWeapon),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, manifestLoadoutFills)),
    }

  action doRejectStaleInitialManifest =
    all {
      qHoles == initialHoleIds,
      recordResult(fillCreationHoles(qDraft, staleExpectedRevision, initialManifestFills)),
    }

  action doRejectUnsupportedLanguage =
    all {
      qHoles.contains(HLanguages),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageElvish] }),
      ])),
    }

  action doRejectDuplicateLanguage =
    all {
      qHoles.contains(HLanguages),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageDwarvish] }),
      ])),
    }

  action doRejectDuplicateFill =
    all {
      qHoles.contains(HLanguages),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, duplicateLanguageHoleFills)),
    }

  action doRejectTooFewLanguages =
    all {
      qHoles.contains(HLanguages),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish] }),
      ])),
    }

  action doRejectTooManyLanguages =
    all {
      qHoles.contains(HLanguages),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin, OLanguageElvish] }),
      ])),
    }

  action doRejectWrongKindPrimaryClass =
    all {
      qHoles.contains(HProgression),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FAbilityScores({
          hole: HProgression,
          method: StandardArray,
          scores: fighterStandardArray,
        }),
      ])),
    }

  action doRejectClosedInitialProgressionHole =
    all {
      not(qHoles.contains(HProgression)),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, closedInitialProgressionHoleFills)),
    }

  action doRejectUnknownLoadoutArmor =
    all {
      not(qHoles.contains(HLoadoutArmor)),
      not(qDraft.equipmentPurchase),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
        FChoice({ hole: HLoadoutArmor, options: [OLoadoutWorn] }),
      ])),
    }

  action doRejectUnsupportedClassEquipment =
    all {
      qHoles.contains(HClassEquipment),
      recordResult(fillCreationHoles(qDraft, qDraft.revision, [
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

  pure def validLastResult(result: str): bool =
    Set("init", "accepted", "rejected").contains(result)

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
    qDraft.revision >= 0
      and qDraft.revision <= 5
      and qDraft.revision <= draftFillCount(qDraft)
      and (qLastResult == "init" implies qDraft == emptyDraft)
      and draftPrerequisitesHold(qDraft)
      and qHoles == openCreationHoles(qDraft)
      and qFinalization == finalizeDraft(qDraft)
      and ((qFinalization == Ready) == draftReadyFieldsHold(qDraft))
      and ((qFinalization == Ready) == (qHoles == Set()))
      and validLastResult(qLastResult)
      and (qLastResult != "rejected" implies qLastBatchIssueCodes == Set())
      and (qLastResult != "rejected" implies qLastFillIssues == Set())
}
