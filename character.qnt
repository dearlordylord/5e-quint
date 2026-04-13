// -*- mode: Bluespec; -*-

module character {
  import creature.* from "./creature"
  import characterCreation.* from "./character-creation"

  // RAW traceability:
  // - Character Creation / Level Advancement: gaining a level chooses a class,
  //   grants new class features, and may require new feature choices.
  // - Character Creation / Starting at Higher Levels: higher-level starts use
  //   the same creation rules plus repeated legal level advancement.
  // - Character Creation / Multiclassing: prerequisites are checked when taking
  //   the new class level rather than only on the terminal sheet.

  type CharacterLevelUpTransition = {
    entry: CharacterAdvancementEntry,
    choices: CharacterBuildChoices,
    spellcasting: OptionalSpellcastingChoices,
  }

  type AdvanceLevelResult =
    | Advanced(CharacterSheet)
    | AdvanceBlocked({ openChoices: Set[CharacterCreationIssueCode], illegalIssues: Set[CharacterCreationIssueCode] })

  pure def pMergeOptionalSkillList(base: OptionalSkillList, patch: OptionalSkillList): OptionalSkillList = match patch {
    | NoSkillList => base
    | _ => patch
  }

  pure def pMergeMulticlassSkills(
    base: OptionalMulticlassSkills,
    patch: OptionalMulticlassSkills,
  ): OptionalMulticlassSkills = match base {
    | HasMulticlassSkills(baseSkills) =>
        match patch {
          | HasMulticlassSkills(patchSkills) =>
              HasMulticlassSkills({
                bard: pMergeOptionalSkillList(baseSkills.bard, patchSkills.bard),
                ranger: pMergeOptionalSkillList(baseSkills.ranger, patchSkills.ranger),
                rogue: pMergeOptionalSkillList(baseSkills.rogue, patchSkills.rogue),
              })
          | _ => base
        }
    | _ => patch
  }

  pure def pMergeOptionalMusicalInstrument(
    base: OptionalMusicalInstrument,
    patch: OptionalMusicalInstrument,
  ): OptionalMusicalInstrument = match patch {
    | NoMusicalInstrument => base
    | _ => patch
  }

  pure def pMergeOptionalGamingSet(base: OptionalGamingSet, patch: OptionalGamingSet): OptionalGamingSet = match patch {
    | NoGamingSet => base
    | _ => patch
  }

  pure def pMergeOptionalMonkTool(base: OptionalMonkTool, patch: OptionalMonkTool): OptionalMonkTool = match patch {
    | NoMonkTool => base
    | _ => patch
  }

  pure def pMergeOptionalSkill(base: OptionalSkill, patch: OptionalSkill): OptionalSkill = match patch {
    | NoSkill => base
    | _ => patch
  }

  pure def pMergeOptionalOriginFeatSelection(
    base: OptionalOriginFeatSelection,
    patch: OptionalOriginFeatSelection,
  ): OptionalOriginFeatSelection = match patch {
    | NoOriginFeatSelection => base
    | _ => patch
  }

  pure def pMergeOptionalMusicalInstrumentList(
    base: OptionalMusicalInstrumentList,
    patch: OptionalMusicalInstrumentList,
  ): OptionalMusicalInstrumentList = match patch {
    | NoMusicalInstrumentList => base
    | _ => patch
  }

  pure def pMergeOptionalGrantedLanguage(
    base: OptionalGrantedLanguage,
    patch: OptionalGrantedLanguage,
  ): OptionalGrantedLanguage = match patch {
    | NoGrantedLanguage => base
    | _ => patch
  }

  pure def pMergeOptionalGrantedLanguageList(
    base: OptionalGrantedLanguageList,
    patch: OptionalGrantedLanguageList,
  ): OptionalGrantedLanguageList = match patch {
    | NoGrantedLanguageList => base
    | _ => patch
  }

  pure def pMergeOptionalString(base: OptionalString, patch: OptionalString): OptionalString = match patch {
    | NoString => base
    | _ => patch
  }

  pure def pMergeOptionalSpellcastingEntry(
    base: OptionalSpellcastingEntry,
    patch: OptionalSpellcastingEntry,
  ): OptionalSpellcastingEntry = match patch {
    | NoSpellcastingEntry => base
    | _ => patch
  }

  pure def pMergeSpellcastingChoices(
    base: OptionalSpellcastingChoices,
    patch: OptionalSpellcastingChoices,
  ): OptionalSpellcastingChoices = match base {
    | HasSpellcastingChoices(baseChoices) =>
        match patch {
          | HasSpellcastingChoices(patchChoices) =>
              HasSpellcastingChoices({
                bard: pMergeOptionalSpellcastingEntry(baseChoices.bard, patchChoices.bard),
                cleric: pMergeOptionalSpellcastingEntry(baseChoices.cleric, patchChoices.cleric),
                druid: pMergeOptionalSpellcastingEntry(baseChoices.druid, patchChoices.druid),
                paladin: pMergeOptionalSpellcastingEntry(baseChoices.paladin, patchChoices.paladin),
                ranger: pMergeOptionalSpellcastingEntry(baseChoices.ranger, patchChoices.ranger),
                sorcerer: pMergeOptionalSpellcastingEntry(baseChoices.sorcerer, patchChoices.sorcerer),
                warlock: pMergeOptionalSpellcastingEntry(baseChoices.warlock, patchChoices.warlock),
                wizard: pMergeOptionalSpellcastingEntry(baseChoices.wizard, patchChoices.wizard),
              })
          | _ => base
        }
    | _ => patch
  }

  pure def pDraftAbilityScoreGenerationFromSheet(
    sheet: CharacterSheet,
  ): CharacterAbilityScoreGeneration = {
    mode: sheet.abilityScoreGeneration.mode,
    assignedScores: Map(
      Str -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Str)),
      Dex -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Dex)),
      Con -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Con)),
      Int_ -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Int_)),
      Wis -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Wis)),
      Cha -> PresentScore(sheet.abilityScoreGeneration.assignedScores.get(Cha)),
    ),
  }

  pure def pDraftEquipmentChoicesFromSheet(
    sheet: CharacterSheet,
  ): CharacterEquipmentChoicesDraft = {
    backgroundOption: HasString(sheet.equipment.backgroundOption),
    classOption: HasString(sheet.equipment.classOption),
    purchasedCombatEquipment: sheet.equipment.purchasedCombatEquipment,
    remainingGoldPieces: HasInt(sheet.equipment.remainingGoldPieces),
    loadout: HasLoadout(sheet.equipment.loadout),
  }

  pure def pClassLevelsFromAdvancement(advancement: List[CharacterAdvancementEntry]): ClassName -> int =
    advancement.foldl(ZERO_CLASS_LEVELS, (levels, entry) =>
      levels.set(entry.className, levels.get(entry.className) + 1))

  pure def pSheetToDraft(sheet: CharacterSheet): CharacterDraft = {
    primaryClass: HasPrimaryClass(sheet.primaryClass),
    classLevels: HasClassLevels(sheet.classLevels),
    advancement: HasAdvancement(sheet.advancement),
    background: HasBackground(sheet.background),
    abilityScoreGeneration: HasAbilityScoreGeneration(pDraftAbilityScoreGenerationFromSheet(sheet)),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(sheet.backgroundAbilityScoreIncrease),
    species: HasSpecies(sheet.species),
    languages: HasLanguages(sheet.languages),
    alignment: HasAlignment(sheet.alignment),
    choices: HasBuildChoices(sheet.choices),
    equipment: HasEquipmentChoices(pDraftEquipmentChoicesFromSheet(sheet)),
    spellcasting: sheet.spellcasting,
  }

  pure def pApplyTransitionChoices(
    choices: CharacterBuildChoices,
    transition: CharacterLevelUpTransition,
  ): CharacterBuildChoices = {
    primaryClassSkills: pMergeOptionalSkillList(choices.primaryClassSkills, transition.choices.primaryClassSkills),
    multiclassSkills: pMergeMulticlassSkills(choices.multiclassSkills, transition.choices.multiclassSkills),
    backgroundTool: pMergeOptionalGamingSet(choices.backgroundTool, transition.choices.backgroundTool),
    bardInstruments: pMergeOptionalMusicalInstrumentList(choices.bardInstruments, transition.choices.bardInstruments),
    multiclassBardInstrument: pMergeOptionalMusicalInstrument(
      choices.multiclassBardInstrument,
      transition.choices.multiclassBardInstrument,
    ),
    monkTool: pMergeOptionalMonkTool(choices.monkTool, transition.choices.monkTool),
    speciesSkill: pMergeOptionalSkill(choices.speciesSkill, transition.choices.speciesSkill),
    humanOriginFeat: pMergeOptionalOriginFeatSelection(choices.humanOriginFeat, transition.choices.humanOriginFeat),
    rogueLanguage: pMergeOptionalGrantedLanguage(choices.rogueLanguage, transition.choices.rogueLanguage),
    rangerDeftExplorerLanguages: pMergeOptionalGrantedLanguageList(
      choices.rangerDeftExplorerLanguages,
      transition.choices.rangerDeftExplorerLanguages,
    ),
    clericDivineOrder: pMergeOptionalString(choices.clericDivineOrder, transition.choices.clericDivineOrder),
    druidPrimalOrder: pMergeOptionalString(choices.druidPrimalOrder, transition.choices.druidPrimalOrder),
  }

  pure def pDraftFromSheetTransition(
    sheet: CharacterSheet,
    transition: CharacterLevelUpTransition,
  ): CharacterDraft = {
    primaryClass: HasPrimaryClass(sheet.primaryClass),
    classLevels: HasClassLevels(pClassLevelsFromAdvancement(sheet.advancement.concat([transition.entry]))),
    advancement: HasAdvancement(sheet.advancement.concat([transition.entry])),
    background: HasBackground(sheet.background),
    abilityScoreGeneration: HasAbilityScoreGeneration(pDraftAbilityScoreGenerationFromSheet(sheet)),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(sheet.backgroundAbilityScoreIncrease),
    species: HasSpecies(sheet.species),
    languages: HasLanguages(sheet.languages),
    alignment: HasAlignment(sheet.alignment),
    choices: HasBuildChoices(pApplyTransitionChoices(sheet.choices, transition)),
    equipment: HasEquipmentChoices(pDraftEquipmentChoicesFromSheet(sheet)),
    spellcasting: pMergeSpellcastingChoices(sheet.spellcasting, transition.spellcasting),
  }

  pure def pSheetLegality(sheet: CharacterSheet): { openChoices: Set[CharacterCreationIssueCode], illegalIssues: Set[CharacterCreationIssueCode] } =
    match pFinalizeDraft(pSheetToDraft(sheet)) {
      | Finalized(replayedSheet) =>
          if (replayedSheet == sheet)
            { openChoices: Set(), illegalIssues: Set() }
          else
            { openChoices: Set(), illegalIssues: Set(ContradictoryFinalizedSheet) }
      | Blocked(issues) => issues
    }

  pure def pIsLegalSheet(sheet: CharacterSheet): bool = {
    val legality = pSheetLegality(sheet)
    legality.openChoices == Set() and legality.illegalIssues == Set()
  }

  pure def pCanAdvance(sheet: CharacterSheet, transition: CharacterLevelUpTransition): bool =
    if (pSheetLegality(sheet) != { openChoices: Set(), illegalIssues: Set() }) false
    else match pFinalizeDraft(pDraftFromSheetTransition(sheet, transition)) {
      | Finalized(_) => true
      | Blocked(_) => false
    }

  pure def pAdvanceLevel(sheet: CharacterSheet, transition: CharacterLevelUpTransition): AdvanceLevelResult = {
    val legality = pSheetLegality(sheet)
    if (legality != { openChoices: Set(), illegalIssues: Set() }) AdvanceBlocked(legality)
    else match pFinalizeDraft(pDraftFromSheetTransition(sheet, transition)) {
      | Finalized(nextSheet) => Advanced(nextSheet)
      | Blocked(issues) => AdvanceBlocked(issues)
    }
  }
}
