// -*- mode: Bluespec; -*-

module characterCreation {
  import creature.* from "./creature"
  import characterCreationSpellData.* from "./character-creation-spell-data"

  // RAW traceability:
  // - Character Creation / Character Origins: class, background, species,
  //   standard languages, ability-score generation, starting equipment
  // - Class spellcasting sections: prepared-spell counts and wizard spellbook
  // - Multiclass prerequisites: creature.qnt helpers mirror the SRD gate

  type CharacterBackground = Acolyte | Criminal | Sage | Soldier

  type Alignment = LG | NG | CG | LN | N | CN | LE | NE | CE

  type CharacterLanguage =
    | Common | CommonSignLanguage | Draconic | Dwarvish | Elvish
    | GiantLanguage | Gnomish | Goblin | HalflingLanguage | Orcish

  type CharacterRareLanguage =
    | Abyssal | CelestialLanguage | DeepSpeech | DruidicLanguage | Infernal
    | Primordial | Sylvan | ThievesCant | Undercommon

  type CharacterGrantedLanguage =
    | StandardGrantedLanguage(CharacterLanguage)
    | RareGrantedLanguage(CharacterRareLanguage)

  type GamingSet = Dice | Dragonchess | PlayingCards | ThreeDragonAnte
  type ArtisanTool =
    | AlchemistsSupplies | BrewersSupplies | CalligraphersSupplies
    | CarpentersTools | CartographersTools | CobblersTools | CooksUtensils
    | GlassblowersTools | JewelersTools | LeatherworkersTools | MasonsTools
    | PaintersSupplies | PottersTools | SmithsTools | TinkersTools
    | WeaversTools | WoodcarversTools
  type MusicalInstrument =
    | Bagpipes | Drum | Dulcimer | Flute | Horn | Lute | Lyre
    | PanFlute | Shawm | Viol
  type CharacterToolProficiency =
    | ArtisanToolProficiency(ArtisanTool)
    | GamingSetProficiency(GamingSet)
    | MusicalInstrumentProficiency(MusicalInstrument)
    | HerbalismKit
    | ThievesTools

  type CharacterSkilledProficiencyChoice =
    | SkilledSkill(Skill)
    | SkilledTool(CharacterToolProficiency)

  type CharacterOriginFeatSelection =
    | OriginAlert
    | OriginSavageAttacker
    | OriginMagicInitiateCleric
    | OriginMagicInitiateDruid
    | OriginMagicInitiateWizard
    | OriginSkilled(List[CharacterSkilledProficiencyChoice])

  type CharacterAdvancementChoice =
    | AbilityScoreImprovement(List[Ability])
    | AdvancementFeat({
        featId: str,
        abilityScoreIncrease: OptionalAbility,
        proficiencies: OptionalSkilledProficiencyChoices,
      })
    | EpicBoonFeat({
        featId: str,
        abilityScoreIncrease: OptionalAbility,
        proficiencies: OptionalSkilledProficiencyChoices,
      })

  type CharacterAdvancementFeatSelection = {
    slot: AdvancementSlot,
    choice: CharacterAdvancementChoice,
  }

  type AdvancementSlot = FeatSlot | EpicBoonSlot

  type CharacterSubclassSelection = {
    className: ClassName,
    subclass: str,
  }

  type PaladinFightingStyleChoice =
    | PaladinFightingStyleFeat(FightingStyleFeat)
    | BlessedWarrior

  type RangerFightingStyleChoice =
    | RangerFightingStyleFeat(FightingStyleFeat)
    | DruidicWarrior

  type CharacterAdvancementEntry = {
    className: ClassName,
    subclass: OptionalSubclassSelection,
    feat: OptionalAdvancementFeatSelection,
  }

  type CharacterLoadout = {
    wornArmor: OptionalString,
    wieldedWeapon: OptionalString,
    secondaryWeapon: OptionalString,
    shield: OptionalBool,
    wieldedWeaponGrip: OptionalWeaponGrip,
  }

  type CharacterEquipmentChoicesDraft = {
    backgroundOption: OptionalString,
    classOption: OptionalString,
    purchasedCombatEquipment: List[str],
    remainingGoldPieces: OptionalInt,
    loadout: OptionalLoadout,
  }

  type CharacterEquipmentChoices = {
    backgroundOption: str,
    classOption: str,
    purchasedCombatEquipment: List[str],
    remainingGoldPieces: int,
    loadout: CharacterLoadout,
  }

  type CharacterSpellcastingEntry = {
    cantrips: OptionalStringList,
    preparedSpells: OptionalStringList,
    spellbook: OptionalStringList,
  }

  type CharacterSpellcastingChoices = {
    bard: OptionalSpellcastingEntry,
    cleric: OptionalSpellcastingEntry,
    druid: OptionalSpellcastingEntry,
    paladin: OptionalSpellcastingEntry,
    ranger: OptionalSpellcastingEntry,
    sorcerer: OptionalSpellcastingEntry,
    warlock: OptionalSpellcastingEntry,
    wizard: OptionalSpellcastingEntry,
  }

  type CharacterMulticlassSkills = {
    bard: OptionalSkillList,
    ranger: OptionalSkillList,
    rogue: OptionalSkillList,
  }

  type CharacterBuildChoices = {
    primaryClassSkills: OptionalSkillList,
    multiclassSkills: OptionalMulticlassSkills,
    backgroundTool: OptionalGamingSet,
    bardInstruments: OptionalMusicalInstrumentList,
    multiclassBardInstrument: OptionalMusicalInstrument,
    monkTool: OptionalMonkTool,
    speciesSkill: OptionalSkill,
    humanOriginFeat: OptionalOriginFeatSelection,
    rogueLanguage: OptionalGrantedLanguage,
    rangerDeftExplorerLanguages: OptionalGrantedLanguageList,
    clericDivineOrder: OptionalString,
    druidPrimalOrder: OptionalString,
    fighterFightingStyle: OptionalFightingStyleFeat,
    championAdditionalFightingStyle: OptionalFightingStyleFeat,
    paladinFightingStyle: OptionalPaladinFightingStyleChoice,
    rangerFightingStyle: OptionalRangerFightingStyleChoice,
    expertiseSkills: OptionalSkillList,
  }

  type CharacterAbilityScoreGeneration = {
    mode: AbilityScoreGenerationMode,
    assignedScores: Ability -> DraftAbilityScore,
  }

  type CharacterDraft = {
    primaryClass: OptionalClassName,
    classLevels: OptionalClassLevels,
    advancement: OptionalAdvancement,
    background: OptionalBackground,
    abilityScoreGeneration: OptionalAbilityScoreGeneration,
    backgroundAbilityScoreIncrease: OptionalBackgroundAbilityScoreIncrease,
    species: OptionalSpecies,
    languages: OptionalLanguages,
    alignment: OptionalAlignment,
    choices: OptionalBuildChoices,
    equipment: OptionalEquipmentChoices,
    spellcasting: OptionalSpellcastingChoices,
  }

  type CharacterSheet = {
    primaryClass: ClassName,
    advancement: List[CharacterAdvancementEntry],
    background: CharacterBackground,
    abilityScoreGeneration: {
      mode: AbilityScoreGenerationMode,
      assignedScores: Ability -> int,
    },
    backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncrease,
    abilityScores: Ability -> int,
    species: Species,
    languages: List[CharacterLanguage],
    alignment: Alignment,
    choices: CharacterBuildChoices,
    equipment: CharacterEquipmentChoices,
    spellcasting: OptionalSpellcastingChoices,
  }

  type OptionalClassName = NoPrimaryClass | HasPrimaryClass(ClassName)
  type OptionalClassLevels = NoClassLevels | HasClassLevels(ClassName -> int)
  type OptionalAdvancement = NoAdvancement | HasAdvancement(List[CharacterAdvancementEntry])
  type OptionalBackground = NoBackground | HasBackground(CharacterBackground)
  type OptionalAbilityScoreGeneration = NoAbilityScoreGeneration | HasAbilityScoreGeneration(CharacterAbilityScoreGeneration)
  type OptionalBackgroundAbilityScoreIncrease = NoBackgroundAbilityScoreIncrease | HasBackgroundAbilityScoreIncrease(BackgroundAbilityScoreIncrease)
  type OptionalSpecies = NoSpecies | HasSpecies(Species)
  type OptionalLanguages = NoLanguages | HasLanguages(List[CharacterLanguage])
  type OptionalAlignment = NoAlignment | HasAlignment(Alignment)
  type OptionalBuildChoices = NoBuildChoices | HasBuildChoices(CharacterBuildChoices)
  type OptionalEquipmentChoices = NoEquipmentChoices | HasEquipmentChoices(CharacterEquipmentChoicesDraft)
  type OptionalSpellcastingChoices = NoSpellcastingChoices | HasSpellcastingChoices(CharacterSpellcastingChoices)
  type OptionalSpellcastingEntry = NoSpellcastingEntry | HasSpellcastingEntry(CharacterSpellcastingEntry)
  type OptionalLoadout = NoLoadout | HasLoadout(CharacterLoadout)
  type OptionalSkill = NoSkill | HasSkill(Skill)
  type OptionalSkillList = NoSkillList | HasSkillList(List[Skill])
  type OptionalMulticlassSkills = NoMulticlassSkills | HasMulticlassSkills(CharacterMulticlassSkills)
  type OptionalGamingSet = NoGamingSet | HasGamingSet(GamingSet)
  type OptionalMusicalInstrument = NoMusicalInstrument | HasMusicalInstrument(MusicalInstrument)
  type OptionalMusicalInstrumentList = NoMusicalInstrumentList | HasMusicalInstrumentList(List[MusicalInstrument])
  type OptionalMonkTool = NoMonkTool | HasMonkTool(CharacterToolProficiency)
  type OptionalOriginFeatSelection = NoOriginFeatSelection | HasOriginFeatSelection(CharacterOriginFeatSelection)
  type OptionalGrantedLanguage = NoGrantedLanguage | HasGrantedLanguage(CharacterGrantedLanguage)
  type OptionalGrantedLanguageList = NoGrantedLanguageList | HasGrantedLanguageList(List[CharacterGrantedLanguage])
  type OptionalFightingStyleFeat = NoFightingStyleFeat | HasFightingStyleFeat(FightingStyleFeat)
  type OptionalPaladinFightingStyleChoice = NoPaladinFightingStyleChoice | HasPaladinFightingStyleChoice(PaladinFightingStyleChoice)
  type OptionalRangerFightingStyleChoice = NoRangerFightingStyleChoice | HasRangerFightingStyleChoice(RangerFightingStyleChoice)
  type OptionalBool = NoBool | HasBool(bool)
  type OptionalInt = NoInt | HasInt(int)
  type OptionalString = NoString | HasString(str)
  type OptionalWeaponGrip = NoWeaponGrip | OneHandedGrip | TwoHandedGrip
  type OptionalAbility = NoAbility | HasAbility(Ability)
  type OptionalSkilledProficiencyChoices = NoSkilledProficiencyChoices | HasSkilledProficiencyChoices(List[CharacterSkilledProficiencyChoice])
  type OptionalSubclassSelection = NoSubclassSelection | HasSubclassSelection(CharacterSubclassSelection)
  type OptionalAdvancementFeatSelection = NoAdvancementFeatSelection | HasAdvancementFeatSelection(CharacterAdvancementFeatSelection)
  type OptionalStringList = NoStringList | HasStringList(List[str])

  type DraftAbilityScore = MissingScore | PresentScore(int)

  type AbilityScoreGenerationMode = StandardArray | RandomGeneration | PointBuy

  type BackgroundAbilityScoreIncrease =
    | PlusTwoPlusOne({ plusTwo: Ability, plusOne: Ability })
    | PlusOneToThree

  type CharacterCreationIssueCode =
    | MissingPrimaryClass | MissingClassLevels | MissingAdvancement | AdvancementRequiredForHigherLevelStart
    | InvalidAdvancement | InvalidClassLevel | InvalidTotalLevel | PrimaryClassLevelMissing
    | MissingBackground | MissingAbilityScoreGeneration | MissingBackgroundAbilityScoreIncrease
    | IncompleteAbilityScores | InvalidAbilityScore | InvalidStandardArray | InvalidPointBuy
    | InvalidBackgroundAbilityScoreIncrease | DuplicateBackgroundAbilityScoreIncreaseAbility
    | AbilityScoreIncreaseExceedsTwenty | MissingSpecies | MissingLanguages | InvalidLanguage
    | DuplicateLanguages | MissingCommonLanguage | TooFewLanguages | TooManyLanguages | MissingAlignment
    | MissingPrimaryClassSkillChoices | WrongPrimaryClassSkillChoiceCount | InvalidPrimaryClassSkillChoice | DuplicatePrimaryClassSkillChoice
    | MissingMulticlassSkillChoice | WrongMulticlassSkillChoiceCount | InvalidMulticlassSkillChoice | DuplicateMulticlassSkillChoice
    | MissingToolChoice | InvalidToolChoiceCount | DuplicateToolChoice
    | MissingSpeciesSkillChoice | InvalidSpeciesSkillChoice
    | MissingOriginFeatChoice | InvalidOriginFeatChoice | WrongSkilledChoiceCount | DuplicateSkilledChoice
    | MissingFeatureChoice | InvalidFeatureChoice | MissingAdvancementChoice | InvalidAdvancementChoice | PrematureFeatChoice | PrematureEpicBoonChoice
    | MissingSubclassSelection | InvalidSubclassSelection | PrematureSubclassSelection
    | MissingGrantedLanguageChoice | WrongGrantedLanguageChoiceCount | InvalidGrantedLanguageChoice | DuplicateGrantedLanguageChoice
    | DuplicateGrantedProficiency | MulticlassPrerequisiteNotMet | AbilityScoreIncreaseExceedsThirty
    | ContradictoryFinalizedSheet
    | MissingEquipmentChoices | MissingBackgroundEquipmentChoice | InvalidBackgroundEquipmentChoice
    | MissingClassEquipmentChoice | InvalidClassEquipmentChoice | MissingRemainingGoldPieces | InvalidRemainingGoldPieces
    | OverspentStartingGold | MissingLoadout | InvalidLoadoutArmor | InvalidLoadoutWieldedWeapon | InvalidLoadoutSecondaryWeapon
    | LoadoutRequiresOwnedShield | LoadoutRequiresWieldedWeapon | InvalidWieldedWeaponGrip | WieldedWeaponGripUnavailable
    | TwoHandedWeaponRequiresTwoHandedGrip | SecondaryWeaponRequiresOneHandedGrip | ShieldRequiresOneHandedGrip
    | ShieldAndSecondaryWeaponConflict | LoadoutConsumesSameWeaponTwice
    | MissingSpellcastingChoices | MissingCantripChoices | WrongCantripChoiceCount | DuplicateCantripChoice
    | InvalidCantripChoice | CantripNotAvailableForClass | MissingPreparedSpellChoices | WrongPreparedSpellChoiceCount
    | DuplicatePreparedSpellChoice | InvalidPreparedSpellChoice | PreparedSpellNotAvailableForClass | SpellLevelNotCastableForClass
    | MissingWizardSpellbookChoices | WrongWizardSpellbookChoiceCount | DuplicateWizardSpellbookChoice
    | InvalidWizardSpellbookChoice | WizardSpellbookSpellNotAvailableForClass | WizardSpellbookSpellLevelNotCastableForClass
    | WizardPreparedSpellNotInSpellbook

  type DraftStatus = DraftComplete | DraftIncomplete | DraftInvalid

  type FinalizeDraftResult =
    | Finalized(CharacterSheet)
    | Blocked({ openChoices: Set[CharacterCreationIssueCode], illegalIssues: Set[CharacterCreationIssueCode] })

  type AdvancementReplay = {
    hasAdvancement: bool,
    advancement: List[CharacterAdvancementEntry],
    classLevels: ClassName -> int,
    primaryClass: OptionalClassName,
    abilityScores: Ability -> int,
    issues: Set[CharacterCreationIssueCode],
  }

  pure val EMPTY_MULTICLASS_SKILLS: CharacterMulticlassSkills = {
    bard: NoSkillList,
    ranger: NoSkillList,
    rogue: NoSkillList,
  }

  pure val EMPTY_BUILD_CHOICES: CharacterBuildChoices = {
    primaryClassSkills: NoSkillList,
    multiclassSkills: NoMulticlassSkills,
    backgroundTool: NoGamingSet,
    bardInstruments: NoMusicalInstrumentList,
    multiclassBardInstrument: NoMusicalInstrument,
    monkTool: NoMonkTool,
    speciesSkill: NoSkill,
    humanOriginFeat: NoOriginFeatSelection,
    rogueLanguage: NoGrantedLanguage,
    rangerDeftExplorerLanguages: NoGrantedLanguageList,
    clericDivineOrder: NoString,
    druidPrimalOrder: NoString,
    fighterFightingStyle: NoFightingStyleFeat,
    championAdditionalFightingStyle: NoFightingStyleFeat,
    paladinFightingStyle: NoPaladinFightingStyleChoice,
    rangerFightingStyle: NoRangerFightingStyleChoice,
    expertiseSkills: NoSkillList,
  }

  pure val EMPTY_LOADOUT: CharacterLoadout = {
    wornArmor: NoString,
    wieldedWeapon: NoString,
    secondaryWeapon: NoString,
    shield: HasBool(false),
    wieldedWeaponGrip: NoWeaponGrip,
  }

  pure val EMPTY_SPELLCASTING_CHOICES: CharacterSpellcastingChoices = {
    bard: NoSpellcastingEntry,
    cleric: NoSpellcastingEntry,
    druid: NoSpellcastingEntry,
    paladin: NoSpellcastingEntry,
    ranger: NoSpellcastingEntry,
    sorcerer: NoSpellcastingEntry,
    warlock: NoSpellcastingEntry,
    wizard: NoSpellcastingEntry,
  }

  pure def pIssueIf(cond: bool, code: CharacterCreationIssueCode): Set[CharacterCreationIssueCode] =
    if (cond) Set(code) else Set()

  pure def pContainsStr(xs: List[str], target: str): bool =
    xs.foldl(false, (acc, x) => acc or x == target)

  pure def pContainsSkill(xs: List[Skill], target: Skill): bool =
    xs.foldl(false, (acc, x) => acc or x == target)

  pure def pDuplicateStrs(xs: List[str]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pDuplicateSkills(xs: List[Skill]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pDuplicateLanguagesList(xs: List[CharacterLanguage]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pDuplicateInstruments(xs: List[MusicalInstrument]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pDuplicateGrantedLanguages(xs: List[CharacterGrantedLanguage]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pDuplicateSkilledChoices(xs: List[CharacterSkilledProficiencyChoice]): bool = {
    val result = xs.foldl({ seen: Set(), dup: false }, (acc, x) =>
      if (acc.seen.contains(x)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(x)), dup: acc.dup })
    result.dup
  }

  pure def pBoolValue(v: OptionalBool): bool = match v {
    | HasBool(value) => value
    | _ => false
  }

  pure def pSkillsValue(v: OptionalSkillList): List[Skill] = match v {
    | HasSkillList(skills) => skills
    | _ => []
  }

  pure def pMusicalInstrumentsValue(v: OptionalMusicalInstrumentList): List[MusicalInstrument] = match v {
    | HasMusicalInstrumentList(items) => items
    | _ => []
  }

  pure def pStringListValue(v: OptionalStringList): List[str] = match v {
    | HasStringList(items) => items
    | _ => []
  }

  pure def pGrantedLanguagesValue(v: OptionalGrantedLanguageList): List[CharacterGrantedLanguage] = match v {
    | HasGrantedLanguageList(items) => items
    | _ => []
  }

  pure def pExpectedExpertiseChoiceCount(classLevels: ClassName -> int): int =
    (if (classLevels.get(Bard) >= 2) 2 else 0)
      + (if (classLevels.get(Bard) >= 9) 2 else 0)
      + (if (classLevels.get(Ranger) >= 2) 1 else 0)
      + (if (classLevels.get(Ranger) >= 9) 2 else 0)
      + (if (classLevels.get(Rogue) >= 1) 2 else 0)
      + (if (classLevels.get(Rogue) >= 6) 2 else 0)
      + (if (classLevels.get(Wizard) >= 2) 1 else 0)

  // SRD 5.2.1 Rules Glossary "Expertise": you gain Expertise in a skill
  // proficiency and can't gain Expertise in the same proficiency more than once.
  pure def pValidWizardScholarExpertiseSkill(skill: Skill): bool =
    skill == Arcana
      or skill == History
      or skill == Investigation
      or skill == Medicine
      or skill == Nature
      or skill == Religion

  pure def pHasFighterFightingStyleSlot(classLevels: ClassName -> int): bool =
    classLevels.get(Fighter) >= 1

  pure def pHasChampionSubclass(advancement: List[CharacterAdvancementEntry]): bool =
    advancement.foldl(false, (hasChampion, entry) =>
      hasChampion or match entry.subclass {
        | HasSubclassSelection(selection) =>
            selection.className == Fighter and selection.subclass == "champion"
        | _ => false
      }
    )

  pure def pHasChampionAdditionalFightingStyleSlot(
    classLevels: ClassName -> int,
    advancement: List[CharacterAdvancementEntry],
  ): bool =
    classLevels.get(Fighter) >= 7 and pHasChampionSubclass(advancement)

  pure def pHasPaladinFightingStyleSlot(classLevels: ClassName -> int): bool =
    classLevels.get(Paladin) >= 2

  pure def pHasRangerFightingStyleSlot(classLevels: ClassName -> int): bool =
    classLevels.get(Ranger) >= 2

  pure def pSelectedFightingStyles(choices: CharacterBuildChoices): List[FightingStyleFeat] = {
    val fighterStyles = match choices.fighterFightingStyle {
      | HasFightingStyleFeat(style) => [style]
      | _ => []
    }
    val championStyles = match choices.championAdditionalFightingStyle {
      | HasFightingStyleFeat(style) => [style]
      | _ => []
    }
    val paladinStyles = match choices.paladinFightingStyle {
      | HasPaladinFightingStyleChoice(choice) =>
          match choice {
            | PaladinFightingStyleFeat(style) => [style]
            | _ => []
          }
      | _ => []
    }
    val rangerStyles = match choices.rangerFightingStyle {
      | HasRangerFightingStyleChoice(choice) =>
          match choice {
            | RangerFightingStyleFeat(style) => [style]
            | _ => []
          }
      | _ => []
    }
    fighterStyles.concat(championStyles).concat(paladinStyles).concat(rangerStyles)
  }

  pure def pDuplicateFightingStyles(styles: List[FightingStyleFeat]): bool = {
    val result = styles.foldl({ seen: Set(), dup: false }, (acc, style) =>
      if (acc.seen.contains(style)) { seen: acc.seen, dup: true }
      else { seen: acc.seen.union(Set(style)), dup: acc.dup })
    result.dup
  }

  pure def pDraftSkillSet(skills: List[Skill]): Set[Skill] =
    skills.foldl(Set(), (acc, skill) => acc.union(Set(skill)))

  pure def pDraftOptionalSkillSet(optionalSkills: OptionalSkillList): Set[Skill] =
    pDraftSkillSet(pSkillsValue(optionalSkills))

  pure def pDraftSkilledSkillProficiencies(
    proficiencies: List[CharacterSkilledProficiencyChoice],
  ): Set[Skill] =
    proficiencies.foldl(Set(), (acc, choice) => match choice {
      | SkilledSkill(skill) => acc.union(Set(skill))
      | _ => acc
    })

  pure def pOriginFeatSkillProficiencies(
    species: OptionalSpecies,
    choices: CharacterBuildChoices,
  ): Set[Skill] =
    if (species == HasSpecies(Human))
      match choices.humanOriginFeat {
        | HasOriginFeatSelection(originFeat) =>
            match originFeat {
              | OriginSkilled(proficiencies) => pDraftSkilledSkillProficiencies(proficiencies)
              | _ => Set()
            }
        | _ => Set()
      }
    else Set()

  pure def pAdvancementSkillProficiencies(
    advancement: List[CharacterAdvancementEntry],
  ): Set[Skill] =
    advancement.foldl(Set(), (acc, entry) => match entry.feat {
      | HasAdvancementFeatSelection(selection) =>
          match selection.choice {
            | AdvancementFeat(feat) =>
                match feat.proficiencies {
                  | HasSkilledProficiencyChoices(proficiencies) => acc.union(pDraftSkilledSkillProficiencies(proficiencies))
                  | _ => acc
                }
            | EpicBoonFeat(feat) =>
                match feat.proficiencies {
                  | HasSkilledProficiencyChoices(proficiencies) => acc.union(pDraftSkilledSkillProficiencies(proficiencies))
                  | _ => acc
                }
            | _ => acc
          }
      | _ => acc
    })

  pure def pDraftGrantedSkillProficiencies(
    draft: CharacterDraft,
    classLevels: ClassName -> int,
    choices: CharacterBuildChoices,
  ): Set[Skill] = {
    val multiclassSkills = match choices.multiclassSkills {
      | HasMulticlassSkills(multiclassChoices) =>
          pDraftOptionalSkillSet(multiclassChoices.bard)
            .union(pDraftOptionalSkillSet(multiclassChoices.ranger))
            .union(pDraftOptionalSkillSet(multiclassChoices.rogue))
      | _ => Set()
    }
    val primarySkills = pDraftOptionalSkillSet(choices.primaryClassSkills)
    val speciesSkills = match choices.speciesSkill {
      | HasSkill(skill) => Set(skill)
      | _ => Set()
    }
    val backgroundSkills = match draft.background {
      | HasBackground(background) => pBackgroundSkillProficiencies(background)
      | _ => Set()
    }

    backgroundSkills
      .union(primarySkills)
      .union(multiclassSkills)
      .union(speciesSkills)
      .union(pOriginFeatSkillProficiencies(draft.species, choices))
      .union(match draft.advancement {
        | HasAdvancement(advancement) => pAdvancementSkillProficiencies(advancement)
        | _ => Set()
      })
  }

  pure def pChoicesValue(v: OptionalBuildChoices): CharacterBuildChoices = match v {
    | HasBuildChoices(choices) => choices
    | _ => EMPTY_BUILD_CHOICES
  }

  pure def pSpellcastingValue(v: OptionalSpellcastingChoices): CharacterSpellcastingChoices = match v {
    | HasSpellcastingChoices(choices) => choices
    | _ => EMPTY_SPELLCASTING_CHOICES
  }

  pure def pLanguagesValue(v: OptionalLanguages): List[CharacterLanguage] = match v {
    | HasLanguages(languages) => languages
    | _ => []
  }

  pure def pResolvedClassLevels(draft: CharacterDraft): ClassName -> int = match draft.advancement {
    | HasAdvancement(advancement) =>
        advancement.foldl(ZERO_CLASS_LEVELS, (levels, entry) =>
          levels.set(entry.className, levels.get(entry.className) + 1))
    | _ =>
        match draft.classLevels {
          | HasClassLevels(levels) => levels
          | _ => ZERO_CLASS_LEVELS
        }
  }

  pure def pCharacterTotalLevel(classLevels: ClassName -> int): int =
    classLevels.keys().fold(0, (total, className) => total + classLevels.get(className))

  pure def pScorePresent(score: DraftAbilityScore): bool = match score {
    | PresentScore(_) => true
    | _ => false
  }

  pure def pAbilityScoresComplete(scores: Ability -> DraftAbilityScore): bool =
    pScorePresent(scores.get(Str))
    and pScorePresent(scores.get(Dex))
    and pScorePresent(scores.get(Con))
    and pScorePresent(scores.get(Int_))
    and pScorePresent(scores.get(Wis))
    and pScorePresent(scores.get(Cha))

  pure def pResolvedAbilityScores(scores: Ability -> DraftAbilityScore): Ability -> int = Map(
    Str -> match scores.get(Str) { | PresentScore(v) => v | _ => 8 },
    Dex -> match scores.get(Dex) { | PresentScore(v) => v | _ => 8 },
    Con -> match scores.get(Con) { | PresentScore(v) => v | _ => 8 },
    Int_ -> match scores.get(Int_) { | PresentScore(v) => v | _ => 8 },
    Wis -> match scores.get(Wis) { | PresentScore(v) => v | _ => 8 },
    Cha -> match scores.get(Cha) { | PresentScore(v) => v | _ => 8 }
  )

  pure def pAbilityScoreList(scores: Ability -> int): List[int] =
    [scores.get(Str), scores.get(Dex), scores.get(Con), scores.get(Int_), scores.get(Wis), scores.get(Cha)]

  pure def pCountInt(xs: List[int], target: int): int =
    xs.foldl(0, (acc, x) => if (x == target) acc + 1 else acc)

  pure def pValidStandardArray(scores: Ability -> int): bool = {
    val vals = pAbilityScoreList(scores)
    pCountInt(vals, 15) == 1 and pCountInt(vals, 14) == 1 and pCountInt(vals, 13) == 1
    and pCountInt(vals, 12) == 1 and pCountInt(vals, 10) == 1 and pCountInt(vals, 8) == 1
  }

  pure def pAllowedBackgroundAbility(background: CharacterBackground, ability: Ability): bool = match background {
    | Acolyte => ability == Int_ or ability == Wis or ability == Cha
    | Criminal => ability == Dex or ability == Con or ability == Int_
    | Sage => ability == Con or ability == Int_ or ability == Wis
    | Soldier => ability == Str or ability == Dex or ability == Con
  }

  pure def pApplyBackgroundIncrease(scores: Ability -> int, background: CharacterBackground, increase: BackgroundAbilityScoreIncrease): Ability -> int = match increase {
    | PlusOneToThree =>
        match background {
          | Acolyte => scores.set(Int_, scores.get(Int_) + 1).set(Wis, scores.get(Wis) + 1).set(Cha, scores.get(Cha) + 1)
          | Criminal => scores.set(Dex, scores.get(Dex) + 1).set(Con, scores.get(Con) + 1).set(Int_, scores.get(Int_) + 1)
          | Sage => scores.set(Con, scores.get(Con) + 1).set(Int_, scores.get(Int_) + 1).set(Wis, scores.get(Wis) + 1)
          | Soldier => scores.set(Str, scores.get(Str) + 1).set(Dex, scores.get(Dex) + 1).set(Con, scores.get(Con) + 1)
        }
    | PlusTwoPlusOne(inc) =>
        scores.set(inc.plusTwo, scores.get(inc.plusTwo) + 2).set(inc.plusOne, scores.get(inc.plusOne) + 1)
  }

  pure def pLanguageIsStandard(language: CharacterLanguage): bool = true
  pure def pGrantedLanguageIsValid(language: CharacterGrantedLanguage): bool = true

  pure def pPrimaryClassSkillChoiceCount(className: ClassName): int = match className {
    | Barbarian => 2 | Bard => 3 | Cleric => 2 | Druid => 2
    | Fighter => 2 | Monk => 2 | Paladin => 2 | Ranger => 3
    | Rogue => 4 | Sorcerer => 2 | Warlock => 2 | Wizard => 2
  }

  pure def pValidPrimaryClassSkill(className: ClassName, skill: Skill): bool = match className {
    | Barbarian => skill == AnimalHandling or skill == Athletics or skill == Intimidation or skill == Nature or skill == Perception or skill == Survival
    | Bard => true
    | Cleric => skill == History or skill == Insight or skill == Medicine or skill == Persuasion or skill == Religion
    | Druid => skill == AnimalHandling or skill == Arcana or skill == Insight or skill == Medicine or skill == Nature or skill == Perception or skill == Religion or skill == Survival
    | Fighter => skill == Acrobatics or skill == AnimalHandling or skill == Athletics or skill == History or skill == Insight or skill == Intimidation or skill == Persuasion or skill == Perception or skill == Survival
    | Monk => skill == Acrobatics or skill == Athletics or skill == History or skill == Insight or skill == Religion or skill == Stealth
    | Paladin => skill == Athletics or skill == Insight or skill == Intimidation or skill == Medicine or skill == Persuasion or skill == Religion
    | Ranger => skill == AnimalHandling or skill == Athletics or skill == Insight or skill == Investigation or skill == Nature or skill == Perception or skill == Stealth or skill == Survival
    | Rogue => skill == Acrobatics or skill == Athletics or skill == Deception or skill == Insight or skill == Intimidation or skill == Investigation or skill == Perception or skill == Persuasion or skill == SleightOfHand or skill == Stealth
    | Sorcerer => skill == Arcana or skill == Deception or skill == Insight or skill == Intimidation or skill == Persuasion or skill == Religion
    | Warlock => skill == Arcana or skill == Deception or skill == History or skill == Intimidation or skill == Investigation or skill == Nature or skill == Religion
    | Wizard => skill == Arcana or skill == History or skill == Insight or skill == Investigation or skill == Medicine or skill == Nature or skill == Religion
  }

  pure def pMulticlassSkillChoiceCount(className: ClassName): int = match className {
    | Bard => 1 | Ranger => 1 | Rogue => 1 | _ => 0
  }

  pure def pValidMulticlassSkill(className: ClassName, skill: Skill): bool = match className {
    | Bard => true
    | Ranger => skill == AnimalHandling or skill == Athletics or skill == Insight or skill == Investigation or skill == Nature or skill == Perception or skill == Stealth or skill == Survival
    | Rogue => skill == Acrobatics or skill == Athletics or skill == Deception or skill == Insight or skill == Intimidation or skill == Investigation or skill == Perception or skill == Persuasion or skill == SleightOfHand or skill == Stealth
    | _ => false
  }

  pure def pSpeciesGrantsSkill(species: Species): bool = species == Elf or species == Human
  pure def pValidSpeciesSkillChoice(species: Species, skill: Skill): bool =
    if (species == Elf) skill == Insight or skill == Perception or skill == Survival
    else species == Human

  pure def pBackgroundSkillProficiencies(background: CharacterBackground): Set[Skill] = match background {
    | Acolyte => Set(Insight, Religion)
    | Criminal => Set(SleightOfHand, Stealth)
    | Sage => Set(Arcana, History)
    | Soldier => Set(Athletics, Intimidation)
  }

  pure def pBackgroundSkillKeys(background: CharacterBackground): List[str] = match background {
    | Acolyte => ["skill:insight", "skill:religion"]
    | Criminal => ["skill:sleightOfHand", "skill:stealth"]
    | Sage => ["skill:arcana", "skill:history"]
    | Soldier => ["skill:athletics", "skill:intimidation"]
  }

  pure def pBackgroundToolKeys(background: CharacterBackground, choice: OptionalGamingSet): List[str] = match background {
    | Acolyte => ["tool:calligraphersSupplies"]
    | Criminal => ["tool:thievesTools"]
    | Sage => ["tool:calligraphersSupplies"]
    | Soldier =>
        match choice {
          | HasGamingSet(Dice) => ["tool:dice"]
          | HasGamingSet(Dragonchess) => ["tool:dragonchess"]
          | HasGamingSet(PlayingCards) => ["tool:playingCards"]
          | HasGamingSet(ThreeDragonAnte) => ["tool:threeDragonAnte"]
          | _ => []
        }
  }

  pure def pSkilledChoiceKey(choice: CharacterSkilledProficiencyChoice): str = match choice {
    | SkilledSkill(skill) =>
        match skill {
          | Acrobatics => "skill:acrobatics" | AnimalHandling => "skill:animalHandling" | Arcana => "skill:arcana"
          | Athletics => "skill:athletics" | Deception => "skill:deception" | History => "skill:history"
          | Insight => "skill:insight" | Intimidation => "skill:intimidation" | Investigation => "skill:investigation"
          | Medicine => "skill:medicine" | Nature => "skill:nature" | Perception => "skill:perception"
          | Performance => "skill:performance" | Persuasion => "skill:persuasion" | Religion => "skill:religion"
          | SleightOfHand => "skill:sleightOfHand" | Stealth => "skill:stealth" | Survival => "skill:survival"
        }
    | SkilledTool(_) => "tool:skilled"
  }

  pure def pSkillKey(skill: Skill): str = match skill {
    | Acrobatics => "skill:acrobatics" | AnimalHandling => "skill:animalHandling" | Arcana => "skill:arcana"
    | Athletics => "skill:athletics" | Deception => "skill:deception" | History => "skill:history"
    | Insight => "skill:insight" | Intimidation => "skill:intimidation" | Investigation => "skill:investigation"
    | Medicine => "skill:medicine" | Nature => "skill:nature" | Perception => "skill:perception"
    | Performance => "skill:performance" | Persuasion => "skill:persuasion" | Religion => "skill:religion"
    | SleightOfHand => "skill:sleightOfHand" | Stealth => "skill:stealth" | Survival => "skill:survival"
  }

  pure def pSkillKeys(skills: List[Skill]): List[str] =
    skills.foldl([], (acc, skill) => acc.concat([pSkillKey(skill)]))

  pure def pRepeatedSkillMarker(skills: List[Skill]): List[str] =
    skills.foldl([], (acc, skill) => acc.concat(["skill:mc"]))

  pure def pLoadoutWeaponGrip(loadout: CharacterLoadout): OptionalWeaponGrip = loadout.wieldedWeaponGrip

  pure def pWeaponCanUseTwoHands(weaponId: str): bool =
    weaponId == "greatclub" or weaponId == "spear" or weaponId == "quarterstaff"
    or weaponId == "battleaxe" or weaponId == "longsword" or weaponId == "warhammer"
    or pWeaponRequiresTwoHands(weaponId)

  pure def pWeaponRequiresTwoHands(weaponId: str): bool =
    weaponId == "greatclub" or weaponId == "lightCrossbow" or weaponId == "shortbow"
    or weaponId == "glaive" or weaponId == "greataxe" or weaponId == "greatsword"
    or weaponId == "halberd" or weaponId == "lance" or weaponId == "maul"
    or weaponId == "pike" or weaponId == "heavyCrossbow" or weaponId == "longbow"

  pure def pArmorCost(armorId: str): int =
    if (armorId == "paddedArmor") 5
    else if (armorId == "leatherArmor") 10
    else if (armorId == "studdedLeatherArmor") 45
    else if (armorId == "hideArmor") 10
    else if (armorId == "chainShirt") 50
    else if (armorId == "scaleMail") 50
    else if (armorId == "breastplate") 400
    else if (armorId == "halfPlateArmor") 750
    else if (armorId == "ringMail") 30
    else if (armorId == "chainMail") 75
    else if (armorId == "splintArmor") 200
    else if (armorId == "plateArmor") 1500
    else 0

  pure def pWeaponCost(weaponId: str): int =
    if (weaponId == "club") 0 else if (weaponId == "dagger") 2 else if (weaponId == "greatclub") 0
    else if (weaponId == "handaxe") 5 else if (weaponId == "javelin") 0 else if (weaponId == "lightHammer") 2
    else if (weaponId == "mace") 5 else if (weaponId == "quarterstaff") 0 else if (weaponId == "sickle") 1
    else if (weaponId == "spear") 1 else if (weaponId == "dart") 0 else if (weaponId == "lightCrossbow") 25
    else if (weaponId == "shortbow") 25 else if (weaponId == "sling") 0 else if (weaponId == "battleaxe") 10
    else if (weaponId == "flail") 10 else if (weaponId == "glaive") 20 else if (weaponId == "greataxe") 30
    else if (weaponId == "greatsword") 50 else if (weaponId == "halberd") 20 else if (weaponId == "lance") 10
    else if (weaponId == "longsword") 15 else if (weaponId == "maul") 10 else if (weaponId == "morningstar") 15
    else if (weaponId == "pike") 5 else if (weaponId == "rapier") 25 else if (weaponId == "scimitar") 25
    else if (weaponId == "shortsword") 10 else if (weaponId == "trident") 5 else if (weaponId == "warhammer") 15
    else if (weaponId == "warPick") 5 else if (weaponId == "whip") 2 else if (weaponId == "blowgun") 10
    else if (weaponId == "handCrossbow") 75 else if (weaponId == "heavyCrossbow") 50 else if (weaponId == "longbow") 50
    else if (weaponId == "musket") 500 else if (weaponId == "pistol") 250
    else 0

  pure def pItemCost(itemId: str): int =
    if (itemId == "shield") 10
    else if (pArmorCost(itemId) > 0) pArmorCost(itemId)
    else pWeaponCost(itemId)

  pure def pCountStr(xs: List[str], target: str): int =
    xs.foldl(0, (acc, x) => if (x == target) acc + 1 else acc)

  pure def pOwnedItems(primaryClass: ClassName, background: CharacterBackground, equipment: CharacterEquipmentChoicesDraft): List[str] = {
    val backgroundItems =
      if (equipment.backgroundOption == HasString("package"))
        match background {
          | Acolyte => []
          | Criminal => ["dagger", "dagger"]
          | Sage => ["quarterstaff"]
          | Soldier => ["spear", "shortbow"]
        }
      else []
    val classItems =
      if (equipment.classOption == HasString("packageA"))
        match primaryClass {
          | Barbarian => ["greataxe", "handaxe", "handaxe", "handaxe", "handaxe"]
          | Bard => ["leatherArmor", "dagger", "dagger"]
          | Cleric => ["chainShirt", "shield", "mace"]
          | Druid => ["leatherArmor", "shield", "sickle", "quarterstaff"]
          | Fighter => ["chainMail", "greatsword", "flail", "javelin", "javelin", "javelin", "javelin", "javelin", "javelin", "javelin", "javelin"]
          | Monk => ["spear", "dagger", "dagger", "dagger", "dagger", "dagger"]
          | Paladin => ["chainMail", "shield", "longsword", "javelin", "javelin", "javelin", "javelin", "javelin", "javelin"]
          | Ranger => ["studdedLeatherArmor", "scimitar", "shortsword", "longbow"]
          | Rogue => ["leatherArmor", "dagger", "dagger", "shortsword", "shortbow"]
          | Sorcerer => ["spear", "dagger", "dagger"]
          | Warlock => ["leatherArmor", "sickle", "dagger", "dagger"]
          | Wizard => ["dagger", "dagger", "quarterstaff"]
        }
      else if (equipment.classOption == HasString("packageB"))
        if (primaryClass == Fighter) ["studdedLeatherArmor", "scimitar", "shortsword", "longbow"] else []
      else []
    backgroundItems.concat(classItems).concat(equipment.purchasedCombatEquipment)
  }

  pure def pStartingGold(primaryClass: ClassName, background: CharacterBackground, equipment: CharacterEquipmentChoicesDraft): int = {
    val backgroundGold =
      if (equipment.backgroundOption == HasString("gold")) 50
      else match background {
        | Acolyte => 8 | Criminal => 16 | Sage => 8 | Soldier => 14
      }
    val classGold =
      if (equipment.classOption == HasString("gold"))
        match primaryClass {
          | Barbarian => 75 | Bard => 90 | Cleric => 110 | Druid => 50 | Fighter => 155 | Monk => 50
          | Paladin => 150 | Ranger => 150 | Rogue => 100 | Sorcerer => 50 | Warlock => 100 | Wizard => 55
        }
      else match primaryClass {
        | Barbarian => 15 | Bard => 19 | Cleric => 7 | Druid => 9 | Fighter => if (equipment.classOption == HasString("packageB")) 11 else 4
        | Monk => 11 | Paladin => 9 | Ranger => 7 | Rogue => 8 | Sorcerer => 28 | Warlock => 15 | Wizard => 5
      }
    backgroundGold + classGold
  }

  pure def pSpellcastingEntryForClass(spellcasting: CharacterSpellcastingChoices, className: ClassName): OptionalSpellcastingEntry = match className {
    | Bard => spellcasting.bard | Cleric => spellcasting.cleric | Druid => spellcasting.druid
    | Paladin => spellcasting.paladin | Ranger => spellcasting.ranger | Sorcerer => spellcasting.sorcerer
    | Warlock => spellcasting.warlock | Wizard => spellcasting.wizard | _ => NoSpellcastingEntry
  }

  pure def pCantripChoiceCount(className: ClassName, level: int, choices: CharacterBuildChoices): int =
    pBaseCantripChoiceCount(className, level)
      + (if (className == Cleric and choices.clericDivineOrder == HasString("thaumaturge")) 1 else 0)
      + (if (className == Druid and choices.druidPrimalOrder == HasString("magician")) 1 else 0)
      + (if (className == Paladin and choices.paladinFightingStyle == HasPaladinFightingStyleChoice(BlessedWarrior)) 2 else 0)
      + (if (className == Ranger and choices.rangerFightingStyle == HasRangerFightingStyleChoice(DruidicWarrior)) 2 else 0)

  pure def pCantripSourceClass(className: ClassName, choices: CharacterBuildChoices): ClassName =
    if (className == Paladin and choices.paladinFightingStyle == HasPaladinFightingStyleChoice(BlessedWarrior)) Cleric
    else if (className == Ranger and choices.rangerFightingStyle == HasRangerFightingStyleChoice(DruidicWarrior)) Druid
    else className

  pure def pClassRequiresOwnedSpellcasting(className: ClassName, level: int, choices: CharacterBuildChoices): bool =
    pCantripChoiceCount(className, level, choices) > 0
    or pPreparedSpellChoiceCount(className, level) > 0
    or (className == Wizard and pWizardSpellbookCount(level) > 0)

  pure def pResolvedAdvancement(draft: CharacterDraft): OptionalAdvancement = match draft.advancement {
    | HasAdvancement(advancement) => HasAdvancement(advancement)
    | _ =>
        match draft.primaryClass {
          | HasPrimaryClass(primary) =>
              match draft.classLevels {
                | HasClassLevels(levels) =>
                    if (pCharacterTotalLevel(levels) == 1 and levels.get(primary) == 1)
                      HasAdvancement([{ className: primary, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection }])
                    else NoAdvancement
                | _ => NoAdvancement
              }
          | _ => NoAdvancement
        }
  }

  pure def pResolvedAdvancementValue(draft: CharacterDraft): List[CharacterAdvancementEntry] = match pResolvedAdvancement(draft) {
    | HasAdvancement(advancement) => advancement
    | _ => []
  }

  pure def pClassLevelsMatch(left: ClassName -> int, right: ClassName -> int): bool =
    left.keys().fold(true, (matches, className) =>
      matches and left.get(className) == right.get(className))

  pure def pClassGainsFeatChoice(className: ClassName, classLevel: int): bool =
    classLevel == 4 or classLevel == 8 or classLevel == 12 or classLevel == 16
      or (className == Fighter and (classLevel == 6 or classLevel == 14))
      or (className == Rogue and classLevel == 10)

  pure def pIsEpicBoonFeatId(featId: str): bool =
    featId == "boon_of_combat_prowess"
      or featId == "boon_of_dimensional_travel"
      or featId == "boon_of_fate"
      or featId == "boon_of_irresistible_offense"
      or featId == "boon_of_spell_recall"
      or featId == "boon_of_the_night_spirit"
      or featId == "boon_of_truesight"

  pure def pApplyScoreIncrease(
    scores: Ability -> int,
    ability: Ability,
    amount: int,
    maxScore: int,
  ): { abilityScores: Ability -> int, issues: Set[CharacterCreationIssueCode] } = {
    val nextScore = scores.get(ability) + amount
    {
      abilityScores: scores.set(ability, if (nextScore > maxScore) maxScore else nextScore),
      issues: pIssueIf(
        nextScore > maxScore,
        if (maxScore == 30) AbilityScoreIncreaseExceedsThirty else AbilityScoreIncreaseExceedsTwenty
      ),
    }
  }

  pure def pApplyAdvancementChoice(
    scores: Ability -> int,
    featSelection: CharacterAdvancementFeatSelection,
  ): { abilityScores: Ability -> int, issues: Set[CharacterCreationIssueCode] } = match featSelection.choice {
    | AbilityScoreImprovement(abilities) =>
        if (abilities.length() < 1 or abilities.length() > 2) {
          { abilityScores: scores, issues: Set(InvalidAdvancementChoice) }
        } else if (abilities.length() == 1) {
          pApplyScoreIncrease(scores, abilities[0], 2, 20)
        } else {
          val first = pApplyScoreIncrease(scores, abilities[0], 1, 20)
          val second = pApplyScoreIncrease(first.abilityScores, abilities[1], 1, 20)
          { abilityScores: second.abilityScores, issues: first.issues.union(second.issues) }
        }
    | AdvancementFeat(choice) =>
        match choice.abilityScoreIncrease {
          | HasAbility(ability) => pApplyScoreIncrease(scores, ability, 1, 20)
          | _ => { abilityScores: scores, issues: Set() }
        }
    | EpicBoonFeat(choice) =>
        match choice.abilityScoreIncrease {
          | HasAbility(ability) => pApplyScoreIncrease(scores, ability, 1, 30)
          | _ => { abilityScores: scores, issues: Set() }
        }
  }

  pure def pReplayAdvancement(draft: CharacterDraft, baseScores: Ability -> int): AdvancementReplay = {
    val resolvedAdvancement = pResolvedAdvancement(draft)
    if (resolvedAdvancement == NoAdvancement) {
      {
        hasAdvancement: false,
        advancement: [],
        classLevels: pResolvedClassLevels(draft),
        primaryClass: draft.primaryClass,
        abilityScores: baseScores,
        issues: Set(),
      }
    } else {
      val advancement = match resolvedAdvancement {
        | HasAdvancement(value) => value
        | _ => []
      }
      if (advancement.length() == 0) {
            {
              hasAdvancement: true,
              advancement: advancement,
              classLevels: ZERO_CLASS_LEVELS,
              primaryClass: draft.primaryClass,
              abilityScores: baseScores,
              issues: Set(InvalidAdvancement),
            }
          } else {
        val derivedClassLevels =
          advancement.foldl(ZERO_CLASS_LEVELS, (levels, entry) =>
            levels.set(entry.className, levels.get(entry.className) + 1))
        val advancementPrimaryClass = advancement[0].className
        val structuralIssues =
          match draft.classLevels {
            | HasClassLevels(draftClassLevels) =>
                pIssueIf(not(pClassLevelsMatch(draftClassLevels, derivedClassLevels)), InvalidAdvancement)
            | _ => Set()
          }
            .union(match draft.primaryClass {
              | HasPrimaryClass(draftPrimaryClass) =>
                  pIssueIf(draftPrimaryClass != advancementPrimaryClass, InvalidAdvancement)
              | _ => Set()
            })
        val replay =
          advancement.foldl(
            {
              classLevels: ZERO_CLASS_LEVELS,
              abilityScores: baseScores,
              issues: structuralIssues,
            },
            (state, entry) => {
              val priorLevel = state.classLevels.get(entry.className)
              val nextLevel = priorLevel + 1
              val nextClassLevels = state.classLevels.set(entry.className, nextLevel)
              if (nextLevel > 20) {
                {
                  classLevels: nextClassLevels,
                  abilityScores: state.abilityScores,
                  issues: state.issues.union(Set(InvalidClassLevel)),
                }
              } else {
                val multiclassIssues =
                  if (priorLevel == 0 and entry.className != advancementPrimaryClass)
                    nextClassLevels.keys().fold(Set(), (acc, className) =>
                      acc.union(
                        pIssueIf(
                          (nextClassLevels.get(className) > 0 or className == entry.className)
                            and not(pMeetsMulticlassPrereq(state.abilityScores, className)),
                          MulticlassPrerequisiteNotMet
                        )
                      )
                    )
                  else Set()
                val subclassIssues =
                  if (nextLevel == 3)
                    match entry.subclass {
                      | NoSubclassSelection => Set(MissingSubclassSelection)
                      | HasSubclassSelection(selection) =>
                          pIssueIf(selection.className != entry.className, InvalidSubclassSelection)
                            .union(
                              pIssueIf(
                                not(pValidSubclassSelection(entry.className, selection.subclass)),
                                InvalidSubclassSelection
                              )
                            )
                    }
                  else match entry.subclass {
                    | HasSubclassSelection(_) =>
                        if (nextLevel < 3) Set(PrematureSubclassSelection) else Set(InvalidSubclassSelection)
                    | _ => Set()
                  }
                val requiresEpicBoon = nextLevel == 19
                val requiresFeatChoice = not(requiresEpicBoon) and pClassGainsFeatChoice(entry.className, nextLevel)
                val featValidation =
                  if (requiresFeatChoice or requiresEpicBoon)
                    match entry.feat {
                      | NoAdvancementFeatSelection =>
                          {
                            abilityScores: state.abilityScores,
                            issues: Set(MissingAdvancementChoice),
                          }
                      | HasAdvancementFeatSelection(featSelection) => {
                          val slotIssues =
                            pIssueIf(requiresFeatChoice and featSelection.slot != FeatSlot, PrematureEpicBoonChoice)
                              .union(
                                pIssueIf(requiresEpicBoon and featSelection.slot != EpicBoonSlot, InvalidAdvancementChoice)
                              )
                          val choiceIssues =
                            match featSelection.choice {
                              | EpicBoonFeat(_) =>
                                  pIssueIf(requiresFeatChoice, PrematureEpicBoonChoice)
                              | AdvancementFeat(choice) =>
                                  pIssueIf(requiresFeatChoice and pIsEpicBoonFeatId(choice.featId), PrematureEpicBoonChoice)
                                    .union(
                                      pIssueIf(requiresEpicBoon and not(pIsEpicBoonFeatId(choice.featId)), InvalidAdvancementChoice)
                                    )
                              | AbilityScoreImprovement(_) => Set()
                            }
                          val applied = pApplyAdvancementChoice(state.abilityScores, featSelection)
                          {
                            abilityScores: applied.abilityScores,
                          issues: slotIssues.union(choiceIssues).union(applied.issues),
                          }
                        }
                    }
                  else match entry.feat {
                    | HasAdvancementFeatSelection(featSelection) =>
                        {
                          val lateFeatIssue = match featSelection.choice {
                            | EpicBoonFeat(_) => PrematureEpicBoonChoice
                            | AdvancementFeat(choice) =>
                                if (pIsEpicBoonFeatId(choice.featId)) PrematureEpicBoonChoice else PrematureFeatChoice
                            | AbilityScoreImprovement(_) => PrematureFeatChoice
                          }
                          {
                            abilityScores: state.abilityScores,
                            issues: Set(lateFeatIssue),
                          }
                        }
                    | _ =>
                        {
                          abilityScores: state.abilityScores,
                          issues: Set(),
                        }
                  }
                {
                  classLevels: nextClassLevels,
                  abilityScores: featValidation.abilityScores,
                  issues: state.issues.union(multiclassIssues).union(subclassIssues).union(featValidation.issues),
                }
              }
            }
          )
        {
          hasAdvancement: true,
          advancement: advancement,
          classLevels: replay.classLevels,
          primaryClass: HasPrimaryClass(advancementPrimaryClass),
          abilityScores: replay.abilityScores,
          issues: replay.issues,
        }
      }
    }
  }

  pure def pHasMulticlassPrereqFailure(finalScores: Ability -> int, primaryClass: ClassName, classLevels: ClassName -> int): bool =
    classLevels.keys().fold(false, (blocked, className) =>
      blocked or (className != primaryClass and classLevels.get(className) > 0 and not(pCanMulticlass(finalScores, primaryClass, className))))

  pure def pOpenChoiceIssues(draft: CharacterDraft): Set[CharacterCreationIssueCode] = {
    val classLevels = pResolvedClassLevels(draft)
    val totalLevel = pCharacterTotalLevel(classLevels)
    val choices = pChoicesValue(draft.choices)
    val languages = pLanguagesValue(draft.languages)
    val primaryClassSkills = pSkillsValue(choices.primaryClassSkills)

    val open0 = pIssueIf(draft.primaryClass == NoPrimaryClass, MissingPrimaryClass)
      .union(pIssueIf(draft.classLevels == NoClassLevels and draft.advancement == NoAdvancement, MissingClassLevels))
      .union(pIssueIf(draft.classLevels == NoClassLevels and draft.advancement == NoAdvancement, MissingAdvancement))
      .union(pIssueIf(draft.advancement == NoAdvancement and totalLevel > 1, AdvancementRequiredForHigherLevelStart))
      .union(pIssueIf(draft.background == NoBackground, MissingBackground))
      .union(pIssueIf(draft.abilityScoreGeneration == NoAbilityScoreGeneration, MissingAbilityScoreGeneration))
      .union(pIssueIf(draft.backgroundAbilityScoreIncrease == NoBackgroundAbilityScoreIncrease, MissingBackgroundAbilityScoreIncrease))
      .union(pIssueIf(draft.species == NoSpecies, MissingSpecies))
      .union(pIssueIf(draft.languages == NoLanguages, MissingLanguages))
      .union(pIssueIf(draft.languages != NoLanguages and languages.foldl(Set(), (acc, language) => acc.union(Set(language))).size() < 3, TooFewLanguages))
      .union(pIssueIf(draft.alignment == NoAlignment, MissingAlignment))

    val open1 = match draft.abilityScoreGeneration {
      | HasAbilityScoreGeneration(generation) =>
          open0.union(pIssueIf(not(pAbilityScoresComplete(generation.assignedScores)), IncompleteAbilityScores))
      | _ => open0
    }

    val open2 = match draft.primaryClass {
      | HasPrimaryClass(primaryClass) =>
          open1
            .union(pIssueIf(choices.primaryClassSkills == NoSkillList, MissingPrimaryClassSkillChoices))
            .union(pIssueIf(choices.primaryClassSkills != NoSkillList and primaryClassSkills.length() != pPrimaryClassSkillChoiceCount(primaryClass), WrongPrimaryClassSkillChoiceCount))
            .union(if (primaryClass == Monk) pIssueIf(choices.monkTool == NoMonkTool, MissingToolChoice) else Set())
            .union(
              if (primaryClass == Bard)
                pIssueIf(
                  choices.bardInstruments != NoMusicalInstrumentList and pMusicalInstrumentsValue(choices.bardInstruments).length() != 3,
                  InvalidToolChoiceCount,
                )
              else Set()
            )
      | _ => open1
    }

    val multiclassSkills = match choices.multiclassSkills {
      | HasMulticlassSkills(skills) => skills
      | _ => EMPTY_MULTICLASS_SKILLS
    }

    val open3 = match draft.primaryClass {
      | HasPrimaryClass(primaryClass) =>
          open2
            .union(
              if (classLevels.get(Bard) > 0 and primaryClass != Bard)
                Set()
                  .union(pIssueIf(multiclassSkills.bard == NoSkillList, MissingMulticlassSkillChoice))
                  .union(pIssueIf(multiclassSkills.bard != NoSkillList and pSkillsValue(multiclassSkills.bard).length() != 1, WrongMulticlassSkillChoiceCount))
                  .union(pIssueIf(choices.multiclassBardInstrument == NoMusicalInstrument, MissingToolChoice))
              else Set()
            )
            .union(
              if (classLevels.get(Ranger) > 0 and primaryClass != Ranger)
                Set()
                  .union(pIssueIf(multiclassSkills.ranger == NoSkillList, MissingMulticlassSkillChoice))
                  .union(pIssueIf(multiclassSkills.ranger != NoSkillList and pSkillsValue(multiclassSkills.ranger).length() != 1, WrongMulticlassSkillChoiceCount))
              else Set()
            )
            .union(
              if (classLevels.get(Rogue) > 0 and primaryClass != Rogue)
                Set()
                  .union(pIssueIf(multiclassSkills.rogue == NoSkillList, MissingMulticlassSkillChoice))
                  .union(pIssueIf(multiclassSkills.rogue != NoSkillList and pSkillsValue(multiclassSkills.rogue).length() != 1, WrongMulticlassSkillChoiceCount))
              else Set()
            )
      | _ => open2
    }

    val open4 = match draft.background {
      | HasBackground(background) =>
          if (background == Soldier)
            open3.union(pIssueIf(choices.backgroundTool == NoGamingSet, MissingToolChoice))
          else open3
      | _ => open3
    }

    val open5 = match draft.species {
      | HasSpecies(species) =>
          open4
            .union(pIssueIf(pSpeciesGrantsSkill(species) and choices.speciesSkill == NoSkill, MissingSpeciesSkillChoice))
            .union(pIssueIf(species == Human and choices.humanOriginFeat == NoOriginFeatSelection, MissingOriginFeatChoice))
      | _ => open4
    }

    val open6 =
      if (classLevels.get(Rogue) > 0) open5.union(pIssueIf(choices.rogueLanguage == NoGrantedLanguage, MissingGrantedLanguageChoice))
      else open5

    val open7 =
      if (classLevels.get(Ranger) >= 2)
        open6
          .union(pIssueIf(choices.rangerDeftExplorerLanguages == NoGrantedLanguageList, MissingGrantedLanguageChoice))
          .union(pIssueIf(choices.rangerDeftExplorerLanguages != NoGrantedLanguageList and pGrantedLanguagesValue(choices.rangerDeftExplorerLanguages).length() != 2, WrongGrantedLanguageChoiceCount))
      else open6

    val expertiseSkills = pSkillsValue(choices.expertiseSkills)
    val expectedExpertiseChoices = pExpectedExpertiseChoiceCount(classLevels)
    val advancement = pResolvedAdvancementValue(draft)

    val open7b =
      open7
        .union(if (classLevels.get(Cleric) > 0) pIssueIf(choices.clericDivineOrder == NoString, MissingFeatureChoice) else Set())
        .union(if (classLevels.get(Druid) > 0) pIssueIf(choices.druidPrimalOrder == NoString, MissingFeatureChoice) else Set())
        .union(if (pHasFighterFightingStyleSlot(classLevels)) pIssueIf(choices.fighterFightingStyle == NoFightingStyleFeat, MissingFeatureChoice) else Set())
        .union(
          if (pHasChampionAdditionalFightingStyleSlot(classLevels, advancement))
            pIssueIf(choices.championAdditionalFightingStyle == NoFightingStyleFeat, MissingFeatureChoice)
          else Set()
        )
        .union(
          if (pHasPaladinFightingStyleSlot(classLevels))
            pIssueIf(choices.paladinFightingStyle == NoPaladinFightingStyleChoice, MissingFeatureChoice)
          else Set()
        )
        .union(
          if (pHasRangerFightingStyleSlot(classLevels))
            pIssueIf(choices.rangerFightingStyle == NoRangerFightingStyleChoice, MissingFeatureChoice)
          else Set()
        )
        // SRD 5.2.1 Paladin/Ranger "Level 2: Fighting Style" plus Ranger
        // "Level 2/9: Expertise" determine when these owned choice slots exist.
        .union(
          if (expectedExpertiseChoices > 0)
            pIssueIf(choices.expertiseSkills == NoSkillList or expertiseSkills.length() < expectedExpertiseChoices, MissingFeatureChoice)
          else Set()
        )

    val open8 = match draft.equipment {
      | NoEquipmentChoices => open7b.union(Set(MissingEquipmentChoices))
      | HasEquipmentChoices(equipment) =>
          open7b
            .union(pIssueIf(equipment.backgroundOption == NoString, MissingBackgroundEquipmentChoice))
            .union(pIssueIf(equipment.classOption == NoString, MissingClassEquipmentChoice))
            .union(pIssueIf(equipment.remainingGoldPieces == NoInt, MissingRemainingGoldPieces))
            .union(pIssueIf(equipment.loadout == NoLoadout, MissingLoadout))
    }

    val advancementOpenIssues = match draft.background {
      | HasBackground(background) =>
          match draft.abilityScoreGeneration {
            | HasAbilityScoreGeneration(generation) =>
                if (not(pAbilityScoresComplete(generation.assignedScores))) Set()
                else match draft.backgroundAbilityScoreIncrease {
                  | HasBackgroundAbilityScoreIncrease(increase) =>
                      pReplayAdvancement(
                        draft,
                        pApplyBackgroundIncrease(
                          pResolvedAbilityScores(generation.assignedScores),
                          background,
                          increase,
                        ),
                      ).issues.filter(issue =>
                        issue == MissingAdvancementChoice or issue == MissingSubclassSelection)
                  | _ => Set()
                }
            | _ => Set()
          }
      | _ => Set()
    }

    classLevels.keys().fold(open8.union(advancementOpenIssues), (acc, className) =>
      if (classLevels.get(className) <= 0 or not(pClassRequiresOwnedSpellcasting(className, classLevels.get(className), choices)))
        acc
      else match pSpellcastingEntryForClass(pSpellcastingValue(draft.spellcasting), className) {
        | NoSpellcastingEntry => acc.union(Set(MissingSpellcastingChoices))
        | HasSpellcastingEntry(entry) =>
            acc
              .union(pIssueIf(pCantripChoiceCount(className, classLevels.get(className), choices) > 0 and entry.cantrips == NoStringList, MissingCantripChoices))
              .union(pIssueIf(entry.cantrips != NoStringList and pStringListValue(entry.cantrips).length() != pCantripChoiceCount(className, classLevels.get(className), choices), WrongCantripChoiceCount))
              .union(pIssueIf(pPreparedSpellChoiceCount(className, classLevels.get(className)) > 0 and entry.preparedSpells == NoStringList, MissingPreparedSpellChoices))
              .union(pIssueIf(entry.preparedSpells != NoStringList and pStringListValue(entry.preparedSpells).length() != pPreparedSpellChoiceCount(className, classLevels.get(className)), WrongPreparedSpellChoiceCount))
              .union(pIssueIf(className == Wizard and entry.spellbook == NoStringList, MissingWizardSpellbookChoices))
              .union(pIssueIf(className == Wizard and entry.spellbook != NoStringList and pStringListValue(entry.spellbook).length() != pWizardSpellbookCount(classLevels.get(className)), WrongWizardSpellbookChoiceCount))
      })
  }

  pure def pIllegalIssues(draft: CharacterDraft): Set[CharacterCreationIssueCode] = {
    val classLevels = pResolvedClassLevels(draft)
    val totalLevel = pCharacterTotalLevel(classLevels)
    val choices = pChoicesValue(draft.choices)
    val languages = pLanguagesValue(draft.languages)
    val primaryClassSkills = pSkillsValue(choices.primaryClassSkills)
    val multiclassSkills = match choices.multiclassSkills { | HasMulticlassSkills(skills) => skills | _ => EMPTY_MULTICLASS_SKILLS }

    val illegal0 = classLevels.keys().fold(Set(), (acc, className) =>
      acc.union(pIssueIf(classLevels.get(className) < 0 or classLevels.get(className) > 20, InvalidClassLevel)))
      .union(pIssueIf(totalLevel < 1 or totalLevel > 20, InvalidTotalLevel))
      .union(match draft.primaryClass { | HasPrimaryClass(primaryClass) => pIssueIf(classLevels.get(primaryClass) < 1, PrimaryClassLevelMissing) | _ => Set() })

    val illegal1 = match draft.abilityScoreGeneration {
      | HasAbilityScoreGeneration(generation) =>
          if (not(pAbilityScoresComplete(generation.assignedScores))) illegal0
          else {
            val scores = pResolvedAbilityScores(generation.assignedScores)
            val invalidRanges = pAbilityScoreList(scores).foldl(false, (acc, score) =>
              acc or if (generation.mode == RandomGeneration) score < 3 or score > 18 else score < 8 or score > 15)
            illegal0
              .union(pIssueIf(invalidRanges, InvalidAbilityScore))
              .union(pIssueIf(generation.mode == StandardArray and not(pValidStandardArray(scores)), InvalidStandardArray))
              .union(pIssueIf(generation.mode == PointBuy and not(pValidPointBuy(pAbilityScoreList(scores))), InvalidPointBuy))
          }
      | _ => illegal0
    }

    val illegal2 = match draft.backgroundAbilityScoreIncrease {
      | HasBackgroundAbilityScoreIncrease(increase) =>
          match increase {
            | PlusTwoPlusOne(v) => illegal1.union(pIssueIf(v.plusTwo == v.plusOne, DuplicateBackgroundAbilityScoreIncreaseAbility))
            | _ => illegal1
          }
      | _ => illegal1
    }

    val illegal3 =
      if (draft.languages == NoLanguages) illegal2
      else illegal2
        .union(pIssueIf(pDuplicateLanguagesList(languages), DuplicateLanguages))
        .union(pIssueIf(not(languages.foldl(false, (acc, language) => acc or language == Common)), MissingCommonLanguage))
        .union(pIssueIf(languages.foldl(Set(), (acc, language) => acc.union(Set(language))).size() > 3, TooManyLanguages))

    val illegal4 = match draft.primaryClass {
      | HasPrimaryClass(primaryClass) =>
          illegal3
            .union(primaryClassSkills.foldl(Set(), (acc, skill) =>
              acc.union(pIssueIf(not(pValidPrimaryClassSkill(primaryClass, skill)), InvalidPrimaryClassSkillChoice))))
            .union(pIssueIf(pDuplicateSkills(primaryClassSkills), DuplicatePrimaryClassSkillChoice))
      | _ => illegal3
    }

    val illegal5 = classLevels.keys().fold(illegal4, (acc, className) =>
      if (classLevels.get(className) <= 0 or pMulticlassSkillChoiceCount(className) == 0)
        acc
      else match draft.primaryClass {
        | HasPrimaryClass(primaryClass) =>
            if (primaryClass == className)
              acc
            else {
              val selected = if (className == Bard) pSkillsValue(multiclassSkills.bard) else if (className == Ranger) pSkillsValue(multiclassSkills.ranger) else pSkillsValue(multiclassSkills.rogue)
              acc
                .union(selected.foldl(Set(), (issues, skill) => issues.union(pIssueIf(not(pValidMulticlassSkill(className, skill)), InvalidMulticlassSkillChoice))))
                .union(pIssueIf(pDuplicateSkills(selected), DuplicateMulticlassSkillChoice))
            }
        | _ => acc
      })

    val illegal6 =
      match draft.species {
        | HasSpecies(species) =>
            illegal5
              .union(match choices.speciesSkill {
                | HasSkill(skill) => pIssueIf(not(pValidSpeciesSkillChoice(species, skill)), InvalidSpeciesSkillChoice)
                | _ => Set()
              })
              .union(pIssueIf(species != Human and choices.humanOriginFeat != NoOriginFeatSelection, InvalidOriginFeatChoice))
        | _ => illegal5
      }

    val illegal7 = match choices.humanOriginFeat {
      | HasOriginFeatSelection(originFeat) =>
          match originFeat {
            | OriginSkilled(selections) =>
                illegal6
                  .union(pIssueIf(selections.length() != 3, WrongSkilledChoiceCount))
                  .union(pIssueIf(pDuplicateSkilledChoices(selections), DuplicateSkilledChoice))
            | _ => illegal6
          }
      | _ => illegal6
    }

    val illegal8 =
      illegal7
        .union(match choices.bardInstruments {
          | HasMusicalInstrumentList(instruments) => pIssueIf(pDuplicateInstruments(instruments), DuplicateToolChoice)
          | _ => Set()
        })
        .union(match choices.rogueLanguage {
          | HasGrantedLanguage(language) => pIssueIf(not(pGrantedLanguageIsValid(language)), InvalidGrantedLanguageChoice)
          | _ => Set()
        })
        .union(match choices.rangerDeftExplorerLanguages {
          | HasGrantedLanguageList(items) =>
              items.foldl(Set(), (acc, language) => acc.union(pIssueIf(not(pGrantedLanguageIsValid(language)), InvalidGrantedLanguageChoice)))
                .union(pIssueIf(pDuplicateGrantedLanguages(items), DuplicateGrantedLanguageChoice))
          | _ => Set()
        })

    val expertiseSkills = pSkillsValue(choices.expertiseSkills)
    val expectedExpertiseChoices = pExpectedExpertiseChoiceCount(classLevels)
    val grantedSkillProficiencies = pDraftGrantedSkillProficiencies(draft, classLevels, choices)
    val advancement = pResolvedAdvancementValue(draft)

    val illegal8b =
      illegal8
        .union(if (not(pHasFighterFightingStyleSlot(classLevels)) and choices.fighterFightingStyle != NoFightingStyleFeat) Set(InvalidFeatureChoice) else Set())
        .union(
          if (not(pHasChampionAdditionalFightingStyleSlot(classLevels, advancement)) and choices.championAdditionalFightingStyle != NoFightingStyleFeat)
            Set(InvalidFeatureChoice)
          else Set()
        )
        .union(
          if (not(pHasPaladinFightingStyleSlot(classLevels)) and choices.paladinFightingStyle != NoPaladinFightingStyleChoice)
            Set(InvalidFeatureChoice)
          else Set()
        )
        .union(
          if (not(pHasRangerFightingStyleSlot(classLevels)) and choices.rangerFightingStyle != NoRangerFightingStyleChoice)
            Set(InvalidFeatureChoice)
          else Set()
        )
        .union(pIssueIf(pDuplicateFightingStyles(pSelectedFightingStyles(choices)), InvalidFeatureChoice))
        .union(
          if (expectedExpertiseChoices == 0 and choices.expertiseSkills != NoSkillList)
            Set(InvalidFeatureChoice)
          else Set()
        )
        .union(
          if (expertiseSkills.length() > expectedExpertiseChoices)
            Set(InvalidFeatureChoice)
          else Set()
        )
        .union(pIssueIf(pDuplicateSkills(expertiseSkills), InvalidFeatureChoice))
        .union(
          expertiseSkills.foldl(Set(), (acc, skill) =>
            acc.union(pIssueIf(not(grantedSkillProficiencies.contains(skill)), InvalidFeatureChoice)))
        )
        .union(
          if (classLevels.get(Wizard) >= 2 and not(expertiseSkills.foldl(false, (hasScholarSkill, skill) =>
            hasScholarSkill or pValidWizardScholarExpertiseSkill(skill))))
            Set(InvalidFeatureChoice)
          else Set()
        )

    val illegal9 = match draft.background {
      | HasBackground(background) =>
          match draft.abilityScoreGeneration {
            | HasAbilityScoreGeneration(generation) =>
                if (not(pAbilityScoresComplete(generation.assignedScores))) illegal8
                else match draft.backgroundAbilityScoreIncrease {
                  | HasBackgroundAbilityScoreIncrease(increase) => {
                      val invalidChoice = match increase {
                        | PlusOneToThree => false
                        | PlusTwoPlusOne(v) => not(pAllowedBackgroundAbility(background, v.plusTwo)) or not(pAllowedBackgroundAbility(background, v.plusOne))
                      }
                      val finalScores = pApplyBackgroundIncrease(pResolvedAbilityScores(generation.assignedScores), background, increase)
                      illegal8b
                        .union(pIssueIf(invalidChoice, InvalidBackgroundAbilityScoreIncrease))
                        .union(pIssueIf(pAbilityScoreList(finalScores).foldl(false, (acc, score) => acc or score > 20), AbilityScoreIncreaseExceedsTwenty))
                    }
                  | _ => illegal8b
                }
            | _ => illegal8b
          }
      | _ => illegal8b
    }

    val illegal10 =
      if (draft.background == NoBackground or draft.primaryClass == NoPrimaryClass) illegal9
      else {
        val background = match draft.background { | HasBackground(value) => value | _ => Soldier }
        val granted0 = pBackgroundSkillKeys(background)
          .concat(pBackgroundToolKeys(background, choices.backgroundTool))
          .concat(pSkillKeys(primaryClassSkills))
        val granted1 = granted0
          .concat(pSkillKeys(pSkillsValue(multiclassSkills.bard)))
          .concat(pSkillKeys(pSkillsValue(multiclassSkills.ranger)))
          .concat(pSkillKeys(pSkillsValue(multiclassSkills.rogue)))
          .concat(match choices.speciesSkill { | HasSkill(_) => ["skill:species"] | _ => [] })
        illegal9.union(pIssueIf(pDuplicateStrs(granted1), DuplicateGrantedProficiency))
      }

    val illegal11 = match draft.equipment {
      | HasEquipmentChoices(equipment) =>
          illegal10
            .union(pIssueIf(equipment.backgroundOption != NoString and equipment.backgroundOption != HasString("package") and equipment.backgroundOption != HasString("gold"), InvalidBackgroundEquipmentChoice))
            .union(match draft.primaryClass {
              | HasPrimaryClass(primaryClass) =>
                  pIssueIf(equipment.classOption != NoString
                    and equipment.classOption != HasString("gold")
                    and equipment.classOption != HasString("packageA")
                    and not(primaryClass == Fighter and equipment.classOption == HasString("packageB")), InvalidClassEquipmentChoice)
              | _ => Set()
            })
            .union(match equipment.remainingGoldPieces { | HasInt(gp) => pIssueIf(gp < 0, InvalidRemainingGoldPieces) | _ => Set() })
            .union(match equipment.loadout {
              | HasLoadout(loadout) =>
                  match draft.primaryClass {
                    | HasPrimaryClass(primaryClass) =>
                        match draft.background {
                          | HasBackground(background) => {
                              val owned = pOwnedItems(primaryClass, background, equipment)
                              val spent = equipment.purchasedCombatEquipment.foldl(0, (total, gearId) => total + pItemCost(gearId))
                                + match equipment.remainingGoldPieces { | HasInt(gp) => gp | _ => 0 }
                              illegal10
                                .union(pIssueIf(spent > pStartingGold(primaryClass, background, equipment), OverspentStartingGold))
                                .union(match loadout.wornArmor { | HasString(armorId) => pIssueIf(pCountStr(owned, armorId) < 1, InvalidLoadoutArmor) | _ => Set() })
                                .union(match loadout.wieldedWeapon { | HasString(weaponId) => pIssueIf(pCountStr(owned, weaponId) < 1, InvalidLoadoutWieldedWeapon) | _ => Set() })
                                .union(match loadout.secondaryWeapon {
                                  | HasString(weaponId) =>
                                      match loadout.wieldedWeapon {
                                        | HasString(mainWeapon) => pIssueIf(pCountStr(owned, weaponId) < if (weaponId == mainWeapon) 2 else 1, InvalidLoadoutSecondaryWeapon)
                                        | _ => pIssueIf(pCountStr(owned, weaponId) < 1, InvalidLoadoutSecondaryWeapon)
                                      }
                                  | _ => Set()
                                })
                                .union(pIssueIf(pBoolValue(loadout.shield) and pCountStr(owned, "shield") < 1, LoadoutRequiresOwnedShield))
                                .union(pIssueIf(loadout.secondaryWeapon != NoString and loadout.wieldedWeapon == NoString, LoadoutRequiresWieldedWeapon))
                                .union(match pLoadoutWeaponGrip(loadout) {
                                  | OneHandedGrip => Set()
                                  | TwoHandedGrip =>
                                      match loadout.wieldedWeapon {
                                        | HasString(weaponId) => pIssueIf(not(pWeaponCanUseTwoHands(weaponId)), WieldedWeaponGripUnavailable)
                                        | _ => Set()
                                      }
                                  | _ => Set()
                                })
                                .union(match loadout.wieldedWeapon {
                                  | HasString(weaponId) => pIssueIf(pWeaponRequiresTwoHands(weaponId) and loadout.wieldedWeaponGrip != TwoHandedGrip, TwoHandedWeaponRequiresTwoHandedGrip)
                                  | _ => Set()
                                })
                                .union(pIssueIf(loadout.secondaryWeapon != NoString and loadout.wieldedWeaponGrip == TwoHandedGrip, SecondaryWeaponRequiresOneHandedGrip))
                                .union(pIssueIf(pBoolValue(loadout.shield) and loadout.wieldedWeaponGrip == TwoHandedGrip, ShieldRequiresOneHandedGrip))
                                .union(pIssueIf(pBoolValue(loadout.shield) and loadout.secondaryWeapon != NoString, ShieldAndSecondaryWeaponConflict))
                                .union(match loadout.wieldedWeapon {
                                  | HasString(mainWeapon) =>
                                      match loadout.secondaryWeapon {
                                        | HasString(offWeapon) => pIssueIf(mainWeapon == offWeapon and pCountStr(owned, mainWeapon) < 2, LoadoutConsumesSameWeaponTwice)
                                        | _ => Set()
                                      }
                                  | _ => Set()
                                })
                            }
                          | _ => illegal10
                        }
                    | _ => illegal10
                  }
              | _ => illegal10
            })
      | _ => illegal10
    }

    val illegal12 = classLevels.keys().fold(illegal11, (acc, className) =>
      if (classLevels.get(className) <= 0 or not(pClassRequiresOwnedSpellcasting(className, classLevels.get(className), choices)))
        acc
      else match pSpellcastingEntryForClass(pSpellcastingValue(draft.spellcasting), className) {
        | HasSpellcastingEntry(entry) => {
            val cantrips = pStringListValue(entry.cantrips)
            val prepared = pStringListValue(entry.preparedSpells)
            val spellbook = pStringListValue(entry.spellbook)
            acc
              .union(pIssueIf(pDuplicateStrs(cantrips), DuplicateCantripChoice))
              .union(pIssueIf(pDuplicateStrs(prepared), DuplicatePreparedSpellChoice))
              .union(pIssueIf(className == Wizard and pDuplicateStrs(spellbook), DuplicateWizardSpellbookChoice))
              .union(cantrips.foldl(Set(), (issues, spellId) =>
                issues
                  .union(pIssueIf(not(pSpellExists(spellId)) or not(pSpellIsCantrip(spellId)), InvalidCantripChoice))
                  .union(pIssueIf(pSpellExists(spellId) and not(pSpellAvailableForClass(spellId, pCantripSourceClass(className, choices))), CantripNotAvailableForClass))))
              .union(prepared.foldl(Set(), (issues, spellId) =>
                issues
                  .union(pIssueIf(not(pSpellExists(spellId)) or pSpellIsCantrip(spellId), InvalidPreparedSpellChoice))
                  .union(pIssueIf(pSpellExists(spellId) and not(pSpellAvailableForClass(spellId, className)), PreparedSpellNotAvailableForClass))
                  .union(pIssueIf(pSpellExists(spellId) and pSpellLevel(spellId) > pMaxSpellLevelForClass(className, classLevels.get(className)), SpellLevelNotCastableForClass))))
              .union(spellbook.foldl(Set(), (issues, spellId) =>
                issues
                  .union(pIssueIf(not(pSpellExists(spellId)) or pSpellIsCantrip(spellId), InvalidWizardSpellbookChoice))
                  .union(pIssueIf(pSpellExists(spellId) and not(pSpellAvailableForClass(spellId, Wizard)), WizardSpellbookSpellNotAvailableForClass))
                  .union(pIssueIf(pSpellExists(spellId) and pSpellLevel(spellId) > pMaxSpellLevelForClass(Wizard, classLevels.get(className)), WizardSpellbookSpellLevelNotCastableForClass))))
              .union(pIssueIf(className == Wizard and prepared.foldl(false, (missing, spellId) => missing or not(pContainsStr(spellbook, spellId))), WizardPreparedSpellNotInSpellbook))
          }
        | _ => acc
      })

    val advancementIllegalIssues = match draft.background {
      | HasBackground(background) =>
          match draft.abilityScoreGeneration {
            | HasAbilityScoreGeneration(generation) =>
                if (not(pAbilityScoresComplete(generation.assignedScores))) Set()
                else match draft.backgroundAbilityScoreIncrease {
                  | HasBackgroundAbilityScoreIncrease(increase) =>
                      pReplayAdvancement(
                        draft,
                        pApplyBackgroundIncrease(
                          pResolvedAbilityScores(generation.assignedScores),
                          background,
                          increase,
                        ),
                      ).issues.filter(issue =>
                        not(issue == MissingAdvancementChoice or issue == MissingSubclassSelection))
                  | _ => Set()
                }
            | _ => Set()
          }
      | _ => Set()
    }

    val illegal13 = illegal12.union(advancementIllegalIssues)

    val open = pOpenChoiceIssues(draft)
    illegal13.filter(issue =>
      if (issue == InvalidTotalLevel) not(open.contains(MissingClassLevels) or open.contains(MissingAdvancement))
      else if (issue == PrimaryClassLevelMissing) not(open.contains(MissingPrimaryClass) or open.contains(MissingClassLevels) or open.contains(MissingAdvancement))
      else true)
  }

  pure def pDraftStatus(draft: CharacterDraft): DraftStatus = {
    val open = pOpenChoiceIssues(draft)
    val illegal = pIllegalIssues(draft)
    if (illegal.size() > 0) DraftInvalid
    else if (open.size() > 0) DraftIncomplete
    else DraftComplete
  }

  pure def pFinalizeDraft(draft: CharacterDraft): FinalizeDraftResult =
    if (pDraftStatus(draft) != DraftComplete) Blocked({ openChoices: pOpenChoiceIssues(draft), illegalIssues: pIllegalIssues(draft) })
    else {
      val background = match draft.background { | HasBackground(value) => value | _ => Soldier }
      val abilityScoreGeneration = match draft.abilityScoreGeneration { | HasAbilityScoreGeneration(value) => value | _ => { mode: StandardArray, assignedScores: Map(Str -> PresentScore(8), Dex -> PresentScore(8), Con -> PresentScore(8), Int_ -> PresentScore(8), Wis -> PresentScore(8), Cha -> PresentScore(8)) } }
      val backgroundIncrease = match draft.backgroundAbilityScoreIncrease { | HasBackgroundAbilityScoreIncrease(value) => value | _ => PlusOneToThree }
      val baseScores = pResolvedAbilityScores(abilityScoreGeneration.assignedScores)
      val advancementReplay = pReplayAdvancement(
        draft,
        pApplyBackgroundIncrease(baseScores, background, backgroundIncrease),
      )
      val primaryClass = match advancementReplay.primaryClass {
        | HasPrimaryClass(value) => value
        | _ => match draft.primaryClass { | HasPrimaryClass(value) => value | _ => Fighter }
      }
      val equipment = match draft.equipment {
        | HasEquipmentChoices(value) =>
            {
              backgroundOption: match value.backgroundOption { | HasString(option) => option | _ => "package" },
              classOption: match value.classOption { | HasString(option) => option | _ => "packageA" },
              purchasedCombatEquipment: value.purchasedCombatEquipment,
              remainingGoldPieces: match value.remainingGoldPieces { | HasInt(gp) => gp | _ => 0 },
              loadout: match value.loadout { | HasLoadout(loadout) => loadout | _ => EMPTY_LOADOUT },
            }
        | _ =>
            {
              backgroundOption: "package",
              classOption: "packageA",
              purchasedCombatEquipment: [],
              remainingGoldPieces: 0,
              loadout: EMPTY_LOADOUT,
            }
      }

      Finalized({
        primaryClass: primaryClass,
        advancement: advancementReplay.advancement,
        background: background,
        abilityScoreGeneration: { mode: abilityScoreGeneration.mode, assignedScores: baseScores },
        backgroundAbilityScoreIncrease: backgroundIncrease,
        abilityScores: advancementReplay.abilityScores,
        species: match draft.species { | HasSpecies(value) => value | _ => Human },
        languages: pLanguagesValue(draft.languages),
        alignment: match draft.alignment { | HasAlignment(value) => value | _ => NG },
        choices: pChoicesValue(draft.choices),
        equipment: equipment,
        spellcasting: draft.spellcasting,
      })
    }
}
