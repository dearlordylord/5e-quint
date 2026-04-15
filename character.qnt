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

  type CharacterCreatureProjection = {
    primaryClass: ClassName,
    subclasses: List[CharacterSubclassSelection],
    species: Species,
    classLevels: ClassName -> int,
    fightingStyles: Set[FightingStyleFeat],
    abilityScores: Ability -> int,
    creatureSize: Size,
    baseWalkSpeed: int,
    saveProficiencies: Set[Ability],
    skillProficiencies: Set[Skill],
    expertiseSkills: Set[Skill],
    armorProficiencies: Set[ArmorCategory],
    hitDieType: int,
    spellcastingAbility: Ability,
    hasSpellcasting: bool,
    unarmoredDefense: UnarmoredDefense,
    features: Set[Feature],
    critRange: int,
    hasFightingStyleFeature: bool,
  }

  pure def pMergeOptionalSkillList(base: OptionalSkillList, patch: OptionalSkillList): OptionalSkillList = match patch {
    | NoSkillList => base
    | _ => patch
  }

  pure def pMergeOptionalStringList(base: OptionalStringList, patch: OptionalStringList): OptionalStringList = match patch {
    | NoStringList => base
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

  pure def pMergeOptionalFightingStyleFeat(
    base: OptionalFightingStyleFeat,
    patch: OptionalFightingStyleFeat,
  ): OptionalFightingStyleFeat = match patch {
    | NoFightingStyleFeat => base
    | _ => patch
  }

  pure def pMergeOptionalPaladinFightingStyleChoice(
    base: OptionalPaladinFightingStyleChoice,
    patch: OptionalPaladinFightingStyleChoice,
  ): OptionalPaladinFightingStyleChoice = match patch {
    | NoPaladinFightingStyleChoice => base
    | _ => patch
  }

  pure def pMergeOptionalRangerFightingStyleChoice(
    base: OptionalRangerFightingStyleChoice,
    patch: OptionalRangerFightingStyleChoice,
  ): OptionalRangerFightingStyleChoice = match patch {
    | NoRangerFightingStyleChoice => base
    | _ => patch
  }

  pure def pMergeOptionalSpellcastingEntry(
    base: OptionalSpellcastingEntry,
    patch: OptionalSpellcastingEntry,
  ): OptionalSpellcastingEntry = match base {
    | HasSpellcastingEntry(baseEntry) =>
        match patch {
          | HasSpellcastingEntry(patchEntry) =>
              HasSpellcastingEntry({
                cantrips: pMergeOptionalStringList(baseEntry.cantrips, patchEntry.cantrips),
                preparedSpells: pMergeOptionalStringList(baseEntry.preparedSpells, patchEntry.preparedSpells),
                spellbook: pMergeOptionalStringList(baseEntry.spellbook, patchEntry.spellbook),
              })
          | _ => base
        }
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
    // Ordered advancement is the owned source of truth. Draft reconstruction
    // keeps classLevels empty so the draft does not restate a derived copy.
    classLevels: NoClassLevels,
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
    fighterFightingStyle: pMergeOptionalFightingStyleFeat(
      choices.fighterFightingStyle,
      transition.choices.fighterFightingStyle,
    ),
    championAdditionalFightingStyle: pMergeOptionalFightingStyleFeat(
      choices.championAdditionalFightingStyle,
      transition.choices.championAdditionalFightingStyle,
    ),
    paladinFightingStyle: pMergeOptionalPaladinFightingStyleChoice(
      choices.paladinFightingStyle,
      transition.choices.paladinFightingStyle,
    ),
    rangerFightingStyle: pMergeOptionalRangerFightingStyleChoice(
      choices.rangerFightingStyle,
      transition.choices.rangerFightingStyle,
    ),
    expertiseSkills: pMergeOptionalSkillList(
      choices.expertiseSkills,
      transition.choices.expertiseSkills,
    ),
  }

  pure def pDraftFromSheetTransition(
    sheet: CharacterSheet,
    transition: CharacterLevelUpTransition,
  ): CharacterDraft = {
    primaryClass: HasPrimaryClass(sheet.primaryClass),
    // Preview candidates likewise keep advancement as the only class-level owner.
    classLevels: NoClassLevels,
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

  pure def pSkillSet(skills: List[Skill]): Set[Skill] =
    skills.foldl(Set(), (acc, skill) => acc.union(Set(skill)))

  pure def pSubclassSelections(advancement: List[CharacterAdvancementEntry]): List[CharacterSubclassSelection] =
    advancement.foldl([], (acc, entry) => match entry.subclass {
      | HasSubclassSelection(selection) => acc.concat([selection])
      | _ => acc
    })

  // RAW traceability for the projection helpers below:
  // - Character Creation: a species determines a character's size and Speed.
  // - Character Origins: each SRD species entry states its Size and Speed.
  // - Class chapters: each Core Class Traits table states hit point die,
  //   saving throw proficiencies, and armor training.
  // - Class tables place subclass selection at level 3 for every SRD class.
  // - Fighter/Paladin/Ranger class tables place Fighting Style at levels 1/2/2.
  // - Spellcasting sections state the spellcasting ability for each caster class.

  pure def pSheetBackgroundSkillProficiencies(background: CharacterBackground): Set[Skill] = match background {
    | Acolyte => Set(Insight, Religion)
    | Criminal => Set(SleightOfHand, Stealth)
    | Sage => Set(Arcana, History)
    | Soldier => Set(Athletics, Intimidation)
  }

  pure def pPrimarySaveProficiencies(primaryClass: ClassName): Set[Ability] = match primaryClass {
    | Barbarian => Set(Str, Con)
    | Bard => Set(Dex, Cha)
    | Cleric => Set(Wis, Cha)
    | Druid => Set(Int_, Wis)
    | Fighter => Set(Str, Con)
    | Monk => Set(Str, Dex)
    | Paladin => Set(Wis, Cha)
    | Ranger => Set(Str, Dex)
    | Rogue => Set(Dex, Int_)
    | Sorcerer => Set(Con, Cha)
    | Warlock => Set(Wis, Cha)
    | Wizard => Set(Int_, Wis)
  }

  pure def pPrimaryArmorProficiencies(primaryClass: ClassName): Set[ArmorCategory] = match primaryClass {
    | Barbarian => Set(LightArmor, MediumArmor)
    | Bard => Set(LightArmor)
    | Cleric => Set(LightArmor, MediumArmor)
    | Druid => Set(LightArmor)
    | Fighter => Set(LightArmor, MediumArmor, HeavyArmor)
    | Monk => Set()
    | Paladin => Set(LightArmor, MediumArmor, HeavyArmor)
    | Ranger => Set(LightArmor, MediumArmor)
    | Rogue => Set(LightArmor)
    | Sorcerer => Set()
    | Warlock => Set(LightArmor)
    | Wizard => Set()
  }

  pure def pMulticlassArmorProficiencies(className: ClassName): Set[ArmorCategory] = match className {
    | Barbarian => Set()
    | Bard => Set(LightArmor)
    | Cleric => Set(LightArmor, MediumArmor)
    | Druid => Set(LightArmor)
    | Fighter => Set(LightArmor, MediumArmor)
    | Monk => Set()
    | Paladin => Set(LightArmor, MediumArmor)
    | Ranger => Set(LightArmor, MediumArmor)
    | Rogue => Set(LightArmor)
    | Sorcerer => Set()
    | Warlock => Set(LightArmor)
    | Wizard => Set()
  }

  pure def pSkilledSkillProficiencies(
    proficiencies: List[CharacterSkilledProficiencyChoice],
  ): Set[Skill] =
    proficiencies.foldl(Set(), (acc, choice) => match choice {
      | SkilledSkill(skill) => acc.union(Set(skill))
      | _ => acc
    })

  pure def pSheetAdvancementSkillProficiencies(
    advancement: List[CharacterAdvancementEntry],
  ): Set[Skill] =
    advancement.foldl(Set(), (acc, entry) => match entry.feat {
      | HasAdvancementFeatSelection(selection) =>
          match selection.choice {
            | AdvancementFeat(feat) =>
                match feat.proficiencies {
                  | HasSkilledProficiencyChoices(proficiencies) => acc.union(pSkilledSkillProficiencies(proficiencies))
                  | _ => acc
                }
            | EpicBoonFeat(feat) =>
                match feat.proficiencies {
                  | HasSkilledProficiencyChoices(proficiencies) => acc.union(pSkilledSkillProficiencies(proficiencies))
                  | _ => acc
                }
            | _ => acc
          }
      | _ => acc
    })

  pure def pOptionalSkillSet(optionalSkills: OptionalSkillList): Set[Skill] = match optionalSkills {
    | HasSkillList(skills) => pSkillSet(skills)
    | _ => Set()
  }

  pure def pSpeciesSkillProficiencies(choices: CharacterBuildChoices): Set[Skill] = match choices.speciesSkill {
    | HasSkill(skill) => Set(skill)
    | _ => Set()
  }

  pure def pSheetSkillProficiencies(sheet: CharacterSheet): Set[Skill] = {
    val multiclassSkills = match sheet.choices.multiclassSkills {
      | HasMulticlassSkills(choices) =>
          pOptionalSkillSet(choices.bard)
            .union(pOptionalSkillSet(choices.ranger))
            .union(pOptionalSkillSet(choices.rogue))
      | _ => Set()
    }
    val originFeatSkills = match sheet.choices.humanOriginFeat {
      | HasOriginFeatSelection(originFeat) =>
          match originFeat {
            | OriginSkilled(proficiencies) => pSkilledSkillProficiencies(proficiencies)
            | _ => Set()
          }
      | _ => Set()
    }

    pSheetBackgroundSkillProficiencies(sheet.background)
      .union(pOptionalSkillSet(sheet.choices.primaryClassSkills))
      .union(multiclassSkills)
      .union(pSpeciesSkillProficiencies(sheet.choices))
      .union(originFeatSkills)
      .union(pSheetAdvancementSkillProficiencies(sheet.advancement))
  }

  pure def pSheetArmorProficiencies(sheet: CharacterSheet): Set[ArmorCategory] = {
    val classLevels = pClassLevelsFromAdvancement(sheet.advancement)
    val multiclassArmor = classLevels.keys().fold(Set(), (acc, className) =>
      if (className == sheet.primaryClass or classLevels.get(className) <= 0) acc
      else acc.union(pMulticlassArmorProficiencies(className)))
    val clericArmor = if (classLevels.get(Cleric) > 0 and sheet.choices.clericDivineOrder == HasString("protector"))
      Set(HeavyArmor)
    else
      Set()
    val druidArmor = if (classLevels.get(Druid) > 0 and sheet.choices.druidPrimalOrder == HasString("warden"))
      Set(MediumArmor)
    else
      Set()
    pPrimaryArmorProficiencies(sheet.primaryClass)
      .union(multiclassArmor)
      .union(clericArmor)
      .union(druidArmor)
  }

  pure def pHitDieType(primaryClass: ClassName): int = match primaryClass {
    | Barbarian => 12
    | Fighter => 10
    | Paladin => 10
    | Ranger => 10
    | Bard => 8
    | Cleric => 8
    | Druid => 8
    | Monk => 8
    | Rogue => 8
    | Warlock => 8
    | Sorcerer => 6
    | Wizard => 6
  }

  pure def pHasSpellcasting(sheet: CharacterSheet): bool =
    pClassLevelsFromAdvancement(sheet.advancement).get(Bard) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Cleric) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Druid) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Paladin) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Ranger) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Sorcerer) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Warlock) > 0
      or pClassLevelsFromAdvancement(sheet.advancement).get(Wizard) > 0

  pure def pIsCasterClass(className: ClassName): bool =
    className == Bard
      or className == Cleric
      or className == Druid
      or className == Paladin
      or className == Ranger
      or className == Sorcerer
      or className == Warlock
      or className == Wizard

  pure def pSpellcastingAbilityForClass(className: ClassName): Ability = match className {
    | Bard => Cha
    | Cleric => Wis
    | Druid => Wis
    | Paladin => Cha
    | Ranger => Wis
    | Sorcerer => Cha
    | Warlock => Cha
    | Wizard => Int_
    | _ => Wis
  }

  pure def pFirstCasterClass(
    advancement: List[CharacterAdvancementEntry],
    fallback: ClassName,
  ): ClassName =
    advancement.foldl(fallback, (acc, entry) =>
      if (pIsCasterClass(acc)) acc
      else if (pIsCasterClass(entry.className)) entry.className
      else acc
    )

  pure def pProjectionSpellcastingAbility(sheet: CharacterSheet): Ability =
    if (pHasSpellcasting(sheet))
      pSpellcastingAbilityForClass(pFirstCasterClass(sheet.advancement, sheet.primaryClass))
    else Wis

  pure def pUnarmoredDefense(sheet: CharacterSheet): UnarmoredDefense =
    if (pClassLevelsFromAdvancement(sheet.advancement).get(Barbarian) > 0) BarbarianUD
    else if (pClassLevelsFromAdvancement(sheet.advancement).get(Monk) > 0) MonkUD
    else NoUnarmoredDefense

  pure def pCreatureFeatures(classLevels: ClassName -> int): Set[Feature] = {
    val fighterFeatures = if (classLevels.get(Fighter) >= 20) Set(FExtraAttack, FExtraAttack2, FExtraAttack3)
      else if (classLevels.get(Fighter) >= 11) Set(FExtraAttack, FExtraAttack2)
      else if (classLevels.get(Fighter) >= 5) Set(FExtraAttack)
      else Set()
    val hasExtraAttack = fighterFeatures.contains(FExtraAttack)
      or classLevels.get(Barbarian) >= 5
      or classLevels.get(Monk) >= 5
      or classLevels.get(Paladin) >= 5
      or classLevels.get(Ranger) >= 5
    if (hasExtraAttack) fighterFeatures.union(Set(FExtraAttack)) else fighterFeatures
  }

  pure def pCritRange(
    subclasses: List[CharacterSubclassSelection],
    classLevels: ClassName -> int,
  ): int =
    val hasFighterSubclassSelection =
      subclasses.foldl(false, (hasSelection, selection) =>
        hasSelection or selection.className == Fighter
      )
    if (hasFighterSubclassSelection and pProjectionSubclass(Fighter, subclasses) == Champion and classLevels.get(Fighter) >= 15) 18
    else if (hasFighterSubclassSelection and pProjectionSubclass(Fighter, subclasses) == Champion and classLevels.get(Fighter) >= 3) 19
    else 20

  pure def pHasFightingStyleFeature(classLevels: ClassName -> int): bool =
    classLevels.get(Fighter) >= 1
      or classLevels.get(Paladin) >= 2
      or classLevels.get(Ranger) >= 2

  pure def pSpeciesCreatureSize(species: Species): Size = match species {
    | Gnome => Small
    | Halfling => Small
    | _ => Medium
  }

  pure def pSpeciesBaseWalkSpeed(species: Species): int = match species {
    | Goliath => 35
    | _ => 30
  }

  pure def pSubclassNameForClass(className: ClassName): SubclassName = match className {
    | Barbarian => PathOfTheBerserker
    | Bard => CollegeOfLore
    | Cleric => LifeDomain
    | Druid => CircleOfTheLand
    | Fighter => Champion
    | Monk => WarriorOfTheOpenHand
    | Paladin => OathOfDevotion
    | Ranger => Hunter
    | Rogue => Thief
    | Sorcerer => DraconicSorcery
    | Warlock => FiendPatron
    | Wizard => Evoker
  }

  pure def pSubclassNameFromSelection(selection: CharacterSubclassSelection): SubclassName =
    pSubclassNameForClass(selection.className)

  pure def pProjectionSubclass(
    primaryClass: ClassName,
    subclasses: List[CharacterSubclassSelection],
  ): SubclassName =
    subclasses.foldl(pSubclassNameForClass(primaryClass), (acc, selection) =>
      if (selection.className == primaryClass)
        pSubclassNameFromSelection(selection)
      else acc
    )

  pure def pProjectionFightingStyles(sheet: CharacterSheet): Set[FightingStyleFeat] =
    pSelectedFightingStyles(sheet.choices).foldl(Set(), (acc, style) =>
      acc.union(Set(style)))

  pure def pProjectionExpertiseSkills(sheet: CharacterSheet): Set[Skill] =
    pSkillsValue(sheet.choices.expertiseSkills).foldl(Set(), (acc, skill) =>
      if (pSheetSkillProficiencies(sheet).contains(skill))
        acc.union(Set(skill))
      else acc)

  // CharacterSheet owns ordered advancement canonically; classLevels are always
  // projected from advancement so contradictory finalized states are unrepresentable.
  pure def pCharacterCreatureProjection(sheet: CharacterSheet): CharacterCreatureProjection = {
    val classLevels = pClassLevelsFromAdvancement(sheet.advancement)
    {
      primaryClass: sheet.primaryClass,
      subclasses: pSubclassSelections(sheet.advancement),
      species: sheet.species,
      classLevels: classLevels,
      fightingStyles: pProjectionFightingStyles(sheet),
      abilityScores: sheet.abilityScores,
      creatureSize: pSpeciesCreatureSize(sheet.species),
      baseWalkSpeed: pSpeciesBaseWalkSpeed(sheet.species),
      saveProficiencies: pPrimarySaveProficiencies(sheet.primaryClass),
      skillProficiencies: pSheetSkillProficiencies(sheet),
      expertiseSkills: pProjectionExpertiseSkills(sheet),
      armorProficiencies: pSheetArmorProficiencies(sheet),
      hitDieType: pHitDieType(sheet.primaryClass),
      spellcastingAbility: pProjectionSpellcastingAbility(sheet),
      hasSpellcasting: pHasSpellcasting(sheet),
      unarmoredDefense: pUnarmoredDefense(sheet),
      features: pCreatureFeatures(classLevels),
      critRange: pCritRange(pSubclassSelections(sheet.advancement), classLevels),
      hasFightingStyleFeature: pHasFightingStyleFeature(classLevels),
    }
  }

  pure def pProjectionToCharConfig(projection: CharacterCreatureProjection): CharConfig = {
    className: projection.primaryClass,
    subclass: pProjectionSubclass(projection.primaryClass, projection.subclasses),
    species: projection.species,
    classLevels: projection.classLevels,
    fightingStyles: projection.fightingStyles,
    abilityScores: projection.abilityScores,
    level: pTotalLevel(projection.classLevels),
    creatureSize: projection.creatureSize,
    speeds: Map(Walk -> projection.baseWalkSpeed, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    saveProficiencies: projection.saveProficiencies,
    skillProficiencies: projection.skillProficiencies,
    expertiseSkills: projection.expertiseSkills,
    armorProficiencies: projection.armorProficiencies,
    hitDieType: projection.hitDieType,
    spellcastingAbility: projection.spellcastingAbility,
    hasSpellcasting: projection.hasSpellcasting,
    unarmoredDefense: projection.unarmoredDefense,
    features: projection.features,
    critRange: projection.critRange,
    hasFightingStyleFeature: projection.hasFightingStyleFeature,
  }

  pure def pSheetToCharConfig(sheet: CharacterSheet): CharConfig =
    pProjectionToCharConfig(pCharacterCreatureProjection(sheet))
}
