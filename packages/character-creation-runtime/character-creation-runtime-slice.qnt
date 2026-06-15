// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY CREATION.CHOICE_DISCOVERY_CARDINALITY

module characterCreationRuntimeSlice {
  // SRD traceability for this character-creation parity model:
  // - Character-Creation.md lines 56-91, 104-123, 143-187, 205-233,
  //   and 239-245: background/species/languages, Standard Array, alignment,
  //   background ASI, starting equipment, and character-build details.
  // - Classes/Fighter.md lines 3-13, 17-20, 29-31, and 56-74:
  //   Fighter level-1 traits, skill choices, Fighting Style, Second Wind,
  //   Weapon Mastery, and starting-equipment option C.
  // - Character-Origins.md lines 21-29, 57-63, and 245-259:
  //   Soldier background and Orc species facts.
  // - Equipment.md lines 82-85, 135, 143, 149, and 334-337:
  //   selected weapon mastery metadata and Dice Set tool option.
  //
  // This model intentionally covers the Orc Soldier Fighter manifest path
  // exercised by character-creation-runtime.mbt.qnt. Broader class entries in
  // TypeScript remain deterministic runtime evidence until class-scoped QNT
  // paths are added.
  //
  // TODO(CAM follow-up): this parity model currently checks hole/status protocol
  // more deeply than finalized build values. Before widening character creation
  // beyond the first manifest, add parity coverage for selected Unit refs,
  // HP/Hit Die derivation, proficiencies, resources, and loadout identity.

  type HoleId =
    | HProgression
    | HBackground
    | HSpecies
    | HAbilityScores
    | HLanguages
    | HAlignment
    | HClassSkills
    | HFighterFightingStyle
    | HFighterWeaponMastery
    | HBackgroundAbilityScoreIncrease
    | HBackgroundTool
    | HClassEquipment
    | HBackgroundEquipment
    | HEquipmentPurchase
    | HLoadoutArmor
    | HLoadoutShield
    | HLoadoutWeapon

  type HoleKind = ChoiceHole | AbilityScoreHole

  type ChoiceOptionId =
    | OClassFighterLevel1
    | OClassFighterLevel2
    | OClassWizardLevel1
    | OBackgroundSoldier
    | OSpeciesOrc
    | OLanguageCommonSignLanguage
    | OLanguageDraconic
    | OLanguageDwarvish
    | OLanguageElvish
    | OLanguageGiant
    | OLanguageGnomish
    | OLanguageGoblin
    | OLanguageHalfling
    | OLanguageOrc
    | OAlignmentLawfulGood
    | OAlignmentNeutralGood
    | OAlignmentChaoticGood
    | OAlignmentLawfulNeutral
    | OAlignmentNeutralNeutral
    | OAlignmentChaoticNeutral
    | OAlignmentLawfulEvil
    | OAlignmentNeutralEvil
    | OAlignmentChaoticEvil
    | OSkillAcrobatics
    | OSkillAnimalHandling
    | OSkillAthletics
    | OSkillHistory
    | OSkillInsight
    | OSkillIntimidation
    | OSkillPersuasion
    | OSkillPerception
    | OSkillSurvival
    | OFightingStyleDefense
    | OWeaponLongsword
    | OWeaponDagger
    | OWeaponSpear
    | OWeaponFlail
    | OWeaponShortbow
    | OBackgroundAsiStrDex
    | OBackgroundAsiStrCon
    | OBackgroundAsiDexStr
    | OBackgroundAsiDexCon
    | OBackgroundAsiConStr
    | OBackgroundAsiConDex
    | OBackgroundAsiOneEach
    | OToolDiceSet
    | OClassEquipmentPackageA
    | OClassEquipmentPackageB
    | OClassEquipmentCoins
    | OBackgroundEquipmentPack
    | OBackgroundEquipmentCoins
    | OArmorChainMail
    | OEquipmentShield
    | OLoadoutWorn
    | OLoadoutWielded
    | OLoadoutWieldedOneHanded

  type AbilityScores = {
    strength: int,
    dexterity: int,
    constitution: int,
    intelligence: int,
    wisdom: int,
    charisma: int,
  }

  type SupportedAbilityScoreMethod = StandardArray | PointBuy

  type ProgressionClassUnit = FighterClassUnit | WizardClassUnit

  type AdvancementHitPointRule = | FixedHigherLevelGain

  type LevelOneProgressionShape = {
    startingClass: ProgressionClassUnit,
  }

  type FighterLevelTwoProgressionShape = {
    advancementHitPointRule: AdvancementHitPointRule,
  }

  type CharacterProgression =
    | LevelOneProgression(LevelOneProgressionShape)
    | FighterLevelTwoProgression(FighterLevelTwoProgressionShape)

  type ProgressionSelection =
    | NoProgression
    | SelectedProgression(CharacterProgression)

  type Fill =
    | FChoice({ hole: HoleId, options: List[ChoiceOptionId] })
    | FAbilityScores({ hole: HoleId, method: SupportedAbilityScoreMethod, scores: AbilityScores })

  type FillIssueCode =
    | UnknownHole
    | DuplicateFill
    | WrongFillKind
    | InvalidChoice
    | InvalidAbilityScores
    | TooFewChoices
    | TooManyChoices
    | UnsupportedChoice

  type BatchIssueCode = | StaleRevision

  type FillIssue = {
    fillIndex: int,
    hole: HoleId,
    code: FillIssueCode,
  }

  type CreationIssues = {
    batch: Set[BatchIssueCode],
    fills: Set[FillIssue],
  }

  type Draft = {
    revision: int,
    progression: ProgressionSelection,
    background: bool,
    species: bool,
    abilityScores: bool,
    languages: bool,
    alignment: bool,
    classSkills: bool,
    fighterFightingStyle: bool,
    fighterWeaponMastery: bool,
    backgroundAbilityScoreIncrease: bool,
    backgroundTool: bool,
    classEquipment: bool,
    backgroundEquipment: bool,
    equipmentPurchase: bool,
    loadoutArmor: bool,
    loadoutShield: bool,
    loadoutWeapon: bool,
  }

  type FillBatchResult =
    | Accepted({ draft: Draft, holes: Set[HoleId], finalization: FinalizationStatus })
    | Rejected({ draft: Draft, holes: Set[HoleId], issues: CreationIssues, finalization: FinalizationStatus })

  type FinalizationStatus = Ready | Incomplete | Invalid

  pure val emptyDraft: Draft = {
    revision: 0,
    progression: NoProgression,
    background: false,
    species: false,
    abilityScores: false,
    languages: false,
    alignment: false,
    classSkills: false,
    fighterFightingStyle: false,
    fighterWeaponMastery: false,
    backgroundAbilityScoreIncrease: false,
    backgroundTool: false,
    classEquipment: false,
    backgroundEquipment: false,
    equipmentPurchase: false,
    loadoutArmor: false,
    loadoutShield: false,
    loadoutWeapon: false,
  }

  pure val fighterLevel1Progression: CharacterProgression =
    LevelOneProgression({ startingClass: FighterClassUnit })

  pure val fighterLevel2Progression: CharacterProgression =
    FighterLevelTwoProgression({
      advancementHitPointRule: FixedHigherLevelGain,
    })

  pure val wizardLevel1Progression: CharacterProgression =
    LevelOneProgression({ startingClass: WizardClassUnit })

  pure def characterProgressionTotalLevel(progression: CharacterProgression): int = match progression {
    | LevelOneProgression(_) => 1
    | FighterLevelTwoProgression(_) => 2
  }

  pure def characterProgressionClassLevel(progression: CharacterProgression, classUnit: ProgressionClassUnit): int =
    match progression {
      | LevelOneProgression(v) =>
          if (v.startingClass == classUnit) 1 else 0
      | FighterLevelTwoProgression(_) =>
          if (classUnit == FighterClassUnit) 2 else 0
    }

  pure def hasProgression(draft: Draft): bool = match draft.progression {
    | NoProgression => false
    | SelectedProgression(_) => true
  }

  pure def selectedProgressionClassLevel(selection: ProgressionSelection, classUnit: ProgressionClassUnit): int =
    match selection {
      | NoProgression => 0
      | SelectedProgression(progression) => characterProgressionClassLevel(progression, classUnit)
    }

  pure def hasFighterProgression(draft: Draft): bool =
    selectedProgressionClassLevel(draft.progression, FighterClassUnit) > 0

  pure def hasWizardProgression(draft: Draft): bool =
    selectedProgressionClassLevel(draft.progression, WizardClassUnit) > 0

  pure val fighterStandardArray: AbilityScores = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 8,
    wisdom: 10,
    charisma: 12,
  }

  pure val standardArrayScoreSet: Set[int] = Set(15, 14, 13, 12, 10, 8)

  pure def abilityScoreSet(scores: AbilityScores): Set[int] =
    Set(scores.strength, scores.dexterity, scores.constitution, scores.intelligence, scores.wisdom, scores.charisma)

  pure def isStandardArrayAssignment(scores: AbilityScores): bool =
    abilityScoreSet(scores) == standardArrayScoreSet

  pure def pointBuyCost(score: int): int =
    if (score == 8) 0
    else if (score == 9) 1
    else if (score == 10) 2
    else if (score == 11) 3
    else if (score == 12) 4
    else if (score == 13) 5
    else if (score == 14) 7
    else if (score == 15) 9
    else 0

  pure def isPointBuyScore(score: int): bool =
    score >= 8 and score <= 15

  pure def pointBuyTotalCost(scores: AbilityScores): int =
    pointBuyCost(scores.strength)
      + pointBuyCost(scores.dexterity)
      + pointBuyCost(scores.constitution)
      + pointBuyCost(scores.intelligence)
      + pointBuyCost(scores.wisdom)
      + pointBuyCost(scores.charisma)

  pure def isPointBuyAssignment(scores: AbilityScores): bool =
    isPointBuyScore(scores.strength)
      and isPointBuyScore(scores.dexterity)
      and isPointBuyScore(scores.constitution)
      and isPointBuyScore(scores.intelligence)
      and isPointBuyScore(scores.wisdom)
      and isPointBuyScore(scores.charisma)
      and pointBuyTotalCost(scores) <= 27

  pure def isValidAbilityScoreAssignment(method: SupportedAbilityScoreMethod, scores: AbilityScores): bool = match method {
    | StandardArray => isStandardArrayAssignment(scores)
    | PointBuy => isPointBuyAssignment(scores)
  }

  pure def openCreationHoles(draft: Draft): Set[HoleId] = {
    val initial = Set(
      if (hasProgression(draft)) Set() else Set(HProgression),
      if (draft.background) Set() else Set(HBackground),
      if (draft.species) Set() else Set(HSpecies),
      if (draft.abilityScores) Set() else Set(HAbilityScores),
      if (draft.languages) Set() else Set(HLanguages),
      if (draft.alignment) Set() else Set(HAlignment),
    ).flatten()

    val classGranted =
      if (hasFighterProgression(draft))
        Set(
          if (draft.classSkills) Set() else Set(HClassSkills),
          if (draft.fighterFightingStyle) Set() else Set(HFighterFightingStyle),
          if (draft.fighterWeaponMastery) Set() else Set(HFighterWeaponMastery),
          if (draft.classEquipment) Set() else Set(HClassEquipment),
        ).flatten()
      else if (hasWizardProgression(draft))
        Set(
          if (draft.classSkills) Set() else Set(HClassSkills),
          if (draft.classEquipment) Set() else Set(HClassEquipment),
        ).flatten()
      else Set()

    val backgroundGranted =
      if (draft.background)
        Set(
          if (draft.backgroundAbilityScoreIncrease) Set() else Set(HBackgroundAbilityScoreIncrease),
          if (draft.backgroundTool) Set() else Set(HBackgroundTool),
          if (draft.backgroundEquipment) Set() else Set(HBackgroundEquipment),
        ).flatten()
      else Set()

    val equipment =
      if (draft.classEquipment and draft.backgroundEquipment)
        Set(
          if (draft.equipmentPurchase) Set() else Set(HEquipmentPurchase),
          if (draft.equipmentPurchase and not(draft.loadoutArmor)) Set(HLoadoutArmor) else Set(),
          if (draft.equipmentPurchase and not(draft.loadoutShield)) Set(HLoadoutShield) else Set(),
          if (draft.equipmentPurchase and not(draft.loadoutWeapon)) Set(HLoadoutWeapon) else Set(),
        ).flatten()
      else Set()

    initial.union(classGranted).union(backgroundGranted).union(equipment)
  }

  pure def finalizeDraft(draft: Draft): FinalizationStatus =
    if (openCreationHoles(draft) != Set()) Incomplete
    else if (
      hasProgression(draft) and draft.background and draft.species
      and draft.abilityScores and draft.languages and draft.alignment
      and (
        (hasFighterProgression(draft) and draft.classSkills and draft.fighterFightingStyle and draft.fighterWeaponMastery)
        or (hasWizardProgression(draft) and draft.classSkills)
      )
      and draft.backgroundAbilityScoreIncrease
      and draft.backgroundTool and draft.classEquipment and draft.backgroundEquipment
      and draft.equipmentPurchase and draft.loadoutArmor and draft.loadoutShield
      and draft.loadoutWeapon
    ) Ready
    else Invalid

  pure def holeKind(hole: HoleId): HoleKind = match hole {
    | HAbilityScores => AbilityScoreHole
    | _ => ChoiceHole
  }

  pure def fillHole(fill: Fill): HoleId = match fill {
    | FChoice(v) => v.hole
    | FAbilityScores(v) => v.hole
  }

  pure def fillKindMatchesHole(fill: Fill, hole: HoleId): bool = match fill {
    | FChoice(_) => holeKind(hole) == ChoiceHole
    | FAbilityScores(_) => holeKind(hole) == AbilityScoreHole
  }

  pure def validOptions(hole: HoleId): Set[ChoiceOptionId] = match hole {
    | HProgression => Set(OClassFighterLevel1, OClassFighterLevel2, OClassWizardLevel1)
    | HBackground => Set(OBackgroundSoldier)
    | HSpecies => Set(OSpeciesOrc)
    | HLanguages => Set(
        OLanguageCommonSignLanguage,
        OLanguageDraconic,
        OLanguageDwarvish,
        OLanguageElvish,
        OLanguageGiant,
        OLanguageGnomish,
        OLanguageGoblin,
        OLanguageHalfling,
        OLanguageOrc,
      )
    | HAlignment => Set(
        OAlignmentLawfulGood,
        OAlignmentNeutralGood,
        OAlignmentChaoticGood,
        OAlignmentLawfulNeutral,
        OAlignmentNeutralNeutral,
        OAlignmentChaoticNeutral,
        OAlignmentLawfulEvil,
        OAlignmentNeutralEvil,
        OAlignmentChaoticEvil,
      )
    | HClassSkills => Set(
        OSkillAcrobatics,
        OSkillAnimalHandling,
        OSkillAthletics,
        OSkillHistory,
        OSkillInsight,
        OSkillIntimidation,
        OSkillPersuasion,
        OSkillPerception,
        OSkillSurvival,
      )
    | HFighterFightingStyle => Set(OFightingStyleDefense)
    | HFighterWeaponMastery => Set(OWeaponLongsword, OWeaponSpear, OWeaponFlail, OWeaponShortbow)
    | HBackgroundAbilityScoreIncrease => Set(
        OBackgroundAsiStrDex,
        OBackgroundAsiStrCon,
        OBackgroundAsiDexStr,
        OBackgroundAsiDexCon,
        OBackgroundAsiConStr,
        OBackgroundAsiConDex,
        OBackgroundAsiOneEach,
      )
    | HBackgroundTool => Set(OToolDiceSet)
    | HClassEquipment => Set(OClassEquipmentPackageA, OClassEquipmentPackageB, OClassEquipmentCoins)
    | HBackgroundEquipment => Set(OBackgroundEquipmentPack, OBackgroundEquipmentCoins)
    | HEquipmentPurchase => Set(OArmorChainMail, OWeaponLongsword, OWeaponDagger, OWeaponFlail, OEquipmentShield)
    | HLoadoutArmor => Set(OLoadoutWorn)
    | HLoadoutShield => Set(OLoadoutWielded)
    | HLoadoutWeapon => Set(OLoadoutWieldedOneHanded)
    | HAbilityScores => Set()
  }

  pure def supportedOptions(hole: HoleId): Set[ChoiceOptionId] = match hole {
    | HProgression => Set(OClassFighterLevel1, OClassFighterLevel2, OClassWizardLevel1)
    | HLanguages => Set(OLanguageDwarvish, OLanguageGoblin)
    | HAlignment => Set(OAlignmentLawfulGood)
    | HClassSkills => Set(OSkillPerception, OSkillSurvival)
    | HFighterWeaponMastery => Set(OWeaponLongsword, OWeaponSpear, OWeaponFlail)
    | HBackgroundAbilityScoreIncrease => Set(OBackgroundAsiStrCon)
    | HClassEquipment => Set(OClassEquipmentCoins)
    | HBackgroundEquipment => Set(OBackgroundEquipmentCoins)
    | _ => validOptions(hole)
  }

  pure def requiredChoiceCount(hole: HoleId): int = match hole {
    | HLanguages => 2
    | HClassSkills => 2
    | HFighterWeaponMastery => 3
    | HEquipmentPurchase => 3
    | _ => 1
  }

  pure def allOptionsIn(options: List[ChoiceOptionId], allowed: Set[ChoiceOptionId]): bool =
    options.foldl(true, (valid, option) => valid and allowed.contains(option))

  pure def hasDuplicateOptions(options: List[ChoiceOptionId]): bool =
    options.foldl({ seen: Set(), duplicate: false }, (acc, option) =>
      {
        seen: acc.seen.union(Set(option)),
        duplicate: acc.duplicate or acc.seen.contains(option),
      }).duplicate

  pure def fillIssue(fill: Fill, fillIndex: int, open: Set[HoleId], previousFills: List[Fill]): Set[FillIssue] = {
    val hole = fillHole(fill)
    val duplicate = previousFills.foldl(false, (found, prior) => found or fillHole(prior) == hole)
    if (duplicate) Set({ fillIndex: fillIndex, hole: hole, code: DuplicateFill })
    else if (not(open.contains(hole))) Set({ fillIndex: fillIndex, hole: hole, code: UnknownHole })
    else if (not(fillKindMatchesHole(fill, hole))) Set({ fillIndex: fillIndex, hole: hole, code: WrongFillKind })
    else match fill {
      | FChoice(v) =>
          val cardinalityIssues =
            Set(
              if (v.options.length() < requiredChoiceCount(hole))
                Set({ fillIndex: fillIndex, hole: hole, code: TooFewChoices })
              else Set(),
              if (v.options.length() > requiredChoiceCount(hole))
                Set({ fillIndex: fillIndex, hole: hole, code: TooManyChoices })
              else Set(),
            ).flatten()
          val optionIssues =
            if (hasDuplicateOptions(v.options) or not(allOptionsIn(v.options, validOptions(hole))))
              Set({ fillIndex: fillIndex, hole: hole, code: InvalidChoice })
            else if (not(allOptionsIn(v.options, supportedOptions(hole))))
              Set({ fillIndex: fillIndex, hole: hole, code: UnsupportedChoice })
            else Set()
          cardinalityIssues.union(optionIssues)
      | FAbilityScores(v) =>
          if (isValidAbilityScoreAssignment(v.method, v.scores)) Set()
          else Set({ fillIndex: fillIndex, hole: hole, code: InvalidAbilityScores })
    }
  }

  pure def fillIssuesForBatch(fills: List[Fill], open: Set[HoleId]): Set[FillIssue] =
    fills.foldl({ fillIndex: 0, prior: [], issues: Set() }, (acc, fill) =>
      {
        fillIndex: acc.fillIndex + 1,
        prior: acc.prior.concat([fill]),
        issues: acc.issues.union(fillIssue(fill, acc.fillIndex, open, acc.prior)),
      }).issues

  pure def optionSelected(options: List[ChoiceOptionId], target: ChoiceOptionId): bool =
    options.foldl(false, (found, option) => found or option == target)

  pure def progressionSelection(options: List[ChoiceOptionId]): ProgressionSelection =
    if (optionSelected(options, OClassFighterLevel1)) SelectedProgression(fighterLevel1Progression)
    else if (optionSelected(options, OClassFighterLevel2)) SelectedProgression(fighterLevel2Progression)
    else if (optionSelected(options, OClassWizardLevel1)) SelectedProgression(wizardLevel1Progression)
    else NoProgression

  pure def applyFill(draft: Draft, fill: Fill): Draft = match fill {
      | FChoice(v) => match v.hole {
        | HProgression => draft.with("progression", progressionSelection(v.options))
        | HBackground => draft.with("background", true)
        | HSpecies => draft.with("species", true)
        | HLanguages => draft.with("languages", true)
        | HAlignment => draft.with("alignment", true)
        | HClassSkills => draft.with("classSkills", true)
        | HFighterFightingStyle => draft.with("fighterFightingStyle", true)
        | HFighterWeaponMastery => draft.with("fighterWeaponMastery", true)
        | HBackgroundAbilityScoreIncrease => draft.with("backgroundAbilityScoreIncrease", true)
        | HBackgroundTool => draft.with("backgroundTool", true)
        | HClassEquipment => draft.with("classEquipment", true)
        | HBackgroundEquipment => draft.with("backgroundEquipment", true)
        | HEquipmentPurchase => draft.with("equipmentPurchase", true)
        | HLoadoutArmor => draft.with("loadoutArmor", true)
        | HLoadoutShield => draft.with("loadoutShield", true)
        | HLoadoutWeapon => draft.with("loadoutWeapon", true)
        | HAbilityScores => draft
      }
    | FAbilityScores(_) => draft.with("abilityScores", true)
  }

  pure def applyAcceptedBatch(draft: Draft, fills: List[Fill]): Draft =
    fills.foldl(draft, (nextDraft, fill) => applyFill(nextDraft, fill))
      .with("revision", draft.revision + 1)

  pure def fillCreationHoles(draft: Draft, expectedRevision: int, fills: List[Fill]): FillBatchResult = {
    val open = openCreationHoles(draft)
    val batchIssues = if (expectedRevision == draft.revision) Set() else Set(StaleRevision)
    val fillIssues = fillIssuesForBatch(fills, open)
    val issues = { batch: batchIssues, fills: fillIssues }

    if (batchIssues != Set() or fillIssues != Set())
      Rejected({ draft: draft, holes: open, issues: issues, finalization: finalizeDraft(draft) })
    else {
      val nextDraft = applyAcceptedBatch(draft, fills)
      Accepted({ draft: nextDraft, holes: openCreationHoles(nextDraft), finalization: finalizeDraft(nextDraft) })
    }
  }

  pure val initialManifestFills: List[Fill] = [
    FChoice({ hole: HProgression, options: [OClassFighterLevel1] }),
    FChoice({ hole: HBackground, options: [OBackgroundSoldier] }),
    FChoice({ hole: HSpecies, options: [OSpeciesOrc] }),
    FAbilityScores({ hole: HAbilityScores, method: StandardArray, scores: fighterStandardArray }),
    FChoice({ hole: HLanguages, options: [OLanguageDwarvish, OLanguageGoblin] }),
    FChoice({ hole: HAlignment, options: [OAlignmentLawfulGood] }),
  ]

  pure val manifestChoiceFills: List[Fill] = [
    FChoice({ hole: HClassSkills, options: [OSkillPerception, OSkillSurvival] }),
    FChoice({ hole: HFighterFightingStyle, options: [OFightingStyleDefense] }),
    FChoice({ hole: HFighterWeaponMastery, options: [OWeaponLongsword, OWeaponSpear, OWeaponFlail] }),
    FChoice({ hole: HBackgroundAbilityScoreIncrease, options: [OBackgroundAsiStrCon] }),
    FChoice({ hole: HBackgroundTool, options: [OToolDiceSet] }),
    FChoice({ hole: HClassEquipment, options: [OClassEquipmentCoins] }),
    FChoice({ hole: HBackgroundEquipment, options: [OBackgroundEquipmentCoins] }),
  ]

  pure val manifestPurchaseFills: List[Fill] = [
    FChoice({ hole: HEquipmentPurchase, options: [OArmorChainMail, OWeaponLongsword, OEquipmentShield] }),
  ]

  pure val manifestLoadoutFills: List[Fill] = [
    FChoice({ hole: HLoadoutArmor, options: [OLoadoutWorn] }),
    FChoice({ hole: HLoadoutShield, options: [OLoadoutWielded] }),
    FChoice({ hole: HLoadoutWeapon, options: [OLoadoutWieldedOneHanded] }),
  ]

  pure def requireAccepted(result: FillBatchResult): Draft = match result {
    | Accepted(v) => v.draft
    | Rejected(_) => emptyDraft
  }

  pure val afterInitialManifest: Draft =
    requireAccepted(fillCreationHoles(emptyDraft, 0, initialManifestFills))

  pure val afterManifestChoices: Draft =
    requireAccepted(fillCreationHoles(afterInitialManifest, 1, manifestChoiceFills))

  pure val afterManifestPurchase: Draft =
    requireAccepted(fillCreationHoles(afterManifestChoices, 2, manifestPurchaseFills))

  pure val completeManifestDraft: Draft =
    requireAccepted(fillCreationHoles(afterManifestPurchase, 3, manifestLoadoutFills))

  pure val initialHoleIds: Set[HoleId] =
    Set(HProgression, HBackground, HSpecies, HAbilityScores, HLanguages, HAlignment)

  pure val afterInitialHoleIds: Set[HoleId] =
    Set(
      HClassSkills,
      HFighterFightingStyle,
      HFighterWeaponMastery,
      HBackgroundAbilityScoreIncrease,
      HBackgroundTool,
      HClassEquipment,
      HBackgroundEquipment,
    )

}
