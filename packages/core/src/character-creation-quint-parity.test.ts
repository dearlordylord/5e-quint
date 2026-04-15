import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  assessCharacterDraft,
  finalizeCharacterDraft,
  singleClassAdvancement,
  type CharacterDraft,
} from "./character-domain.ts";
import type { ClassName } from "./features/class-tables.ts";

function advancementEntry(
  className: ClassName,
  entry: Omit<
    NonNullable<CharacterDraft["advancement"]>[number],
    "className"
  > = {},
): NonNullable<CharacterDraft["advancement"]>[number] {
  return { className, ...entry };
}

function completeDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return {
    primaryClass: "fighter",
    advancement: singleClassAdvancement("fighter", 1),
    background: "soldier",
    abilityScoreGeneration: {
      mode: "standardArray",
      assignedScores: {
        str: 15,
        dex: 13,
        con: 14,
        int: 8,
        wis: 10,
        cha: 12,
      },
    },
    backgroundAbilityScoreIncrease: {
      kind: "plusTwoPlusOne",
      plusTwo: "str",
      plusOne: "con",
    },
    species: "human",
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: "NG",
    choices: {
      primaryClassSkills: ["acrobatics", "perception"],
      backgroundTool: "dice",
      speciesSkill: "stealth",
      fighterFightingStyle: "defense",
      humanOriginFeat: {
        feat: "skilled",
        proficiencies: ["history", "thievesTools", "viol"],
      },
    },
    equipment: {
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 18,
      loadout: {
        wieldedWeapon: "greatsword",
        wieldedWeaponGrip: "twoHanded",
      },
    },
    ...overrides,
  };
}

const alertFeat = {
  slot: "feat",
  choice: { tag: "feat", featId: "alert" },
} as const;

function issueCodeToQuint(code: string): string {
  return `${code[0]!.toUpperCase()}${code.slice(1)}`;
}

function renderIssueSet(codes: ReadonlyArray<string>): string {
  return codes.length === 0
    ? "Set()"
    : `Set(${codes.map(issueCodeToQuint).join(", ")})`;
}

const FIGHTER_STANDARD_SCORES_QUINT = `Map(
  Str -> PresentScore(15),
  Dex -> PresentScore(13),
  Con -> PresentScore(14),
  Int_ -> PresentScore(8),
  Wis -> PresentScore(10),
  Cha -> PresentScore(12),
)`;

const COMPLETE_FIGHTER_CHOICES_QUINT = `{
      primaryClassSkills: HasSkillList([Acrobatics, Perception]),
      multiclassSkills: NoMulticlassSkills,
      backgroundTool: HasGamingSet(Dice),
      bardInstruments: NoMusicalInstrumentList,
      multiclassBardInstrument: NoMusicalInstrument,
      monkTool: NoMonkTool,
      speciesSkill: HasSkill(Stealth),
      humanOriginFeat: HasOriginFeatSelection(OriginSkilled([
        SkilledSkill(History),
        SkilledTool(ThievesTools),
        SkilledTool(MusicalInstrumentProficiency(Viol)),
      ])),
      rogueLanguage: NoGrantedLanguage,
      rangerDeftExplorerLanguages: NoGrantedLanguageList,
      clericDivineOrder: NoString,
      druidPrimalOrder: NoString,
      fighterFightingStyle: HasFightingStyleFeat(FSDefense),
      championAdditionalFightingStyle: NoFightingStyleFeat,
      paladinFightingStyle: NoPaladinFightingStyleChoice,
      rangerFightingStyle: NoRangerFightingStyleChoice,
      expertiseSkills: NoSkillList,
    }`;

const WIZARD_CHOICES_QUINT = `{
      primaryClassSkills: HasSkillList([Investigation, Medicine]),
      multiclassSkills: NoMulticlassSkills,
      backgroundTool: NoGamingSet,
      bardInstruments: NoMusicalInstrumentList,
      multiclassBardInstrument: NoMusicalInstrument,
      monkTool: NoMonkTool,
      speciesSkill: HasSkill(Perception),
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
    }`;

const WIZARD_SCHOLAR_CHOICES_QUINT = `{
      primaryClassSkills: HasSkillList([Investigation, Medicine]),
      multiclassSkills: NoMulticlassSkills,
      backgroundTool: NoGamingSet,
      bardInstruments: NoMusicalInstrumentList,
      multiclassBardInstrument: NoMusicalInstrument,
      monkTool: NoMonkTool,
      speciesSkill: HasSkill(Perception),
      humanOriginFeat: NoOriginFeatSelection,
      rogueLanguage: NoGrantedLanguage,
      rangerDeftExplorerLanguages: NoGrantedLanguageList,
      clericDivineOrder: NoString,
      druidPrimalOrder: NoString,
      fighterFightingStyle: NoFightingStyleFeat,
      championAdditionalFightingStyle: NoFightingStyleFeat,
      paladinFightingStyle: NoPaladinFightingStyleChoice,
      rangerFightingStyle: NoRangerFightingStyleChoice,
      expertiseSkills: HasSkillList([Investigation]),
    }`;

function runCharacterCreationQuintParity(): void {
  const cases: ReadonlyArray<{
    readonly name: string;
    readonly draft: CharacterDraft;
    readonly quintDraft: string;
    readonly finalAssertions?: ReadonlyArray<string>;
  }> = [
    {
      name: "fighter_level_four_complete",
      draft: completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str"],
              },
            },
          }),
        ],
        classLevels: { fighter: 4 },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Fighter),
    classLevels: HasClassLevels(singleClassLevels(Fighter, 4)),
    advancement: HasAdvancement([
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: HasSubclassSelection({ className: Fighter, subclass: "champion" }), feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: HasAdvancementFeatSelection({ slot: FeatSlot, choice: AbilityScoreImprovement([Str]) }) },
    ]),
    background: HasBackground(Soldier),
    abilityScoreGeneration: HasAbilityScoreGeneration({ mode: StandardArray, assignedScores: ${FIGHTER_STANDARD_SCORES_QUINT} }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Str, plusOne: Con })),
    species: HasSpecies(Human),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${COMPLETE_FIGHTER_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("packageA"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(18),
      loadout: HasLoadout(EMPTY_LOADOUT.with("wieldedWeapon", HasString("greatsword")).with("wieldedWeaponGrip", TwoHandedGrip)),
    }),
    spellcasting: NoSpellcastingChoices,
  }`,
      finalAssertions: [
        "assert(sheet.classLevels.get(Fighter) == 4)",
        "assert(sheet.abilityScores.get(Str) == 19)",
        'assert(sheet.equipment.backgroundOption == "package")',
        'assert(sheet.equipment.classOption == "packageA")',
        "assert(sheet.equipment.remainingGoldPieces == 18)",
      ],
    },
    {
      name: "fighter_level_three_missing_subclass",
      draft: completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter"),
        ],
        classLevels: { fighter: 3 },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Fighter),
    classLevels: HasClassLevels(singleClassLevels(Fighter, 3)),
    advancement: HasAdvancement([
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
    ]),
    background: HasBackground(Soldier),
    abilityScoreGeneration: HasAbilityScoreGeneration({ mode: StandardArray, assignedScores: ${FIGHTER_STANDARD_SCORES_QUINT} }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Str, plusOne: Con })),
    species: HasSpecies(Human),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${COMPLETE_FIGHTER_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("packageA"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(18),
      loadout: HasLoadout(EMPTY_LOADOUT.with("wieldedWeapon", HasString("greatsword")).with("wieldedWeaponGrip", TwoHandedGrip)),
      }),
      spellcasting: NoSpellcastingChoices,
    }`,
    },
    {
      name: "fighter_level_four_premature_epic_boon",
      draft: completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: { tag: "feat", featId: "boon_of_combat_prowess" },
            },
          }),
        ],
        classLevels: { fighter: 4 },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Fighter),
    classLevels: HasClassLevels(singleClassLevels(Fighter, 4)),
    advancement: HasAdvancement([
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: HasSubclassSelection({ className: Fighter, subclass: "champion" }), feat: NoAdvancementFeatSelection },
      {
        className: Fighter,
        subclass: NoSubclassSelection,
        feat: HasAdvancementFeatSelection({
          slot: FeatSlot,
          choice: AdvancementFeat({
            featId: "boon_of_combat_prowess",
            abilityScoreIncrease: NoAbility,
            proficiencies: NoSkilledProficiencyChoices,
          }),
        }),
      },
    ]),
    background: HasBackground(Soldier),
    abilityScoreGeneration: HasAbilityScoreGeneration({ mode: StandardArray, assignedScores: ${FIGHTER_STANDARD_SCORES_QUINT} }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Str, plusOne: Con })),
    species: HasSpecies(Human),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${COMPLETE_FIGHTER_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("packageA"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(18),
      loadout: HasLoadout(EMPTY_LOADOUT.with("wieldedWeapon", HasString("greatsword")).with("wieldedWeaponGrip", TwoHandedGrip)),
      }),
      spellcasting: NoSpellcastingChoices,
    }`,
    },
    {
      name: "fighter_level_seven_without_champion_does_not_open_additional_style",
      draft: completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str"],
              },
            },
          }),
          advancementEntry("fighter"),
          advancementEntry("fighter", { feat: alertFeat }),
          advancementEntry("fighter"),
        ],
        classLevels: { fighter: 7 },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Fighter),
    classLevels: HasClassLevels(singleClassLevels(Fighter, 7)),
    advancement: HasAdvancement([
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Fighter, subclass: NoSubclassSelection, feat: HasAdvancementFeatSelection({ slot: FeatSlot, choice: AbilityScoreImprovement([Str]) }) },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      {
        className: Fighter,
        subclass: NoSubclassSelection,
        feat: HasAdvancementFeatSelection({
          slot: FeatSlot,
          choice: AdvancementFeat({
            featId: "alert",
            abilityScoreIncrease: NoAbility,
            proficiencies: NoSkilledProficiencyChoices,
          }),
        }),
      },
      { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
    ]),
    background: HasBackground(Soldier),
    abilityScoreGeneration: HasAbilityScoreGeneration({ mode: StandardArray, assignedScores: ${FIGHTER_STANDARD_SCORES_QUINT} }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Str, plusOne: Con })),
    species: HasSpecies(Human),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${COMPLETE_FIGHTER_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("packageA"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(18),
      loadout: HasLoadout(EMPTY_LOADOUT.with("wieldedWeapon", HasString("greatsword")).with("wieldedWeaponGrip", TwoHandedGrip)),
      }),
      spellcasting: NoSpellcastingChoices,
    }`,
    },
    {
      name: "wizard_level_one_full_registry",
      draft: completeDraft({
        primaryClass: "wizard",
        advancement: singleClassAdvancement("wizard", 1),
        classLevels: { wizard: 1 },
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        choices: {
          primaryClassSkills: ["investigation", "medicine"],
          speciesSkill: "perception",
        },
        equipment: {
          backgroundOption: "package",
          classOption: "gold",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {},
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "magic_missile",
            ],
            spellbook: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "magic_missile",
              "identify",
              "sleep",
            ],
          },
        },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Wizard),
    classLevels: HasClassLevels(singleClassLevels(Wizard, 1)),
    advancement: HasAdvancement([{ className: Wizard, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection }]),
    background: HasBackground(Sage),
    abilityScoreGeneration: HasAbilityScoreGeneration({
      mode: StandardArray,
      assignedScores: Map(Str -> PresentScore(15), Dex -> PresentScore(13), Con -> PresentScore(14), Int_ -> PresentScore(8), Wis -> PresentScore(10), Cha -> PresentScore(12)),
    }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Int_, plusOne: Wis })),
    species: HasSpecies(Elf),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${WIZARD_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("gold"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(8),
      loadout: HasLoadout(EMPTY_LOADOUT),
    }),
    spellcasting: HasSpellcastingChoices(EMPTY_SPELLCASTING_CHOICES.with(
      "wizard",
      HasSpellcastingEntry({
        cantrips: HasStringList(["fire_bolt", "light", "mage_hand"]),
        preparedSpells: HasStringList(["burning_hands", "charm_person", "detect_magic", "magic_missile"]),
        spellbook: HasStringList(["burning_hands", "charm_person", "detect_magic", "magic_missile", "identify", "sleep"]),
      })
    )),
  }`,
      finalAssertions: [
        "assert(sheet.classLevels.get(Wizard) == 1)",
        "assert(sheet.abilityScores.get(Int_) == 10)",
        "assert(sheet.abilityScores.get(Wis) == 11)",
      ],
    },
    {
      name: "wizard_level_two_scholar_expertise",
      draft: completeDraft({
        primaryClass: "wizard",
        advancement: [advancementEntry("wizard"), advancementEntry("wizard")],
        classLevels: { wizard: 2 },
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        choices: {
          primaryClassSkills: ["investigation", "medicine"],
          speciesSkill: "perception",
          expertiseSkills: ["investigation"],
        },
        equipment: {
          backgroundOption: "package",
          classOption: "gold",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {},
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
            ],
            spellbook: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
              "shield",
              "sleep",
              "thunderwave",
            ],
          },
        },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Wizard),
    classLevels: HasClassLevels(singleClassLevels(Wizard, 2)),
    advancement: HasAdvancement([
      { className: Wizard, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Wizard, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
    ]),
    background: HasBackground(Sage),
    abilityScoreGeneration: HasAbilityScoreGeneration({
      mode: StandardArray,
      assignedScores: Map(Str -> PresentScore(15), Dex -> PresentScore(13), Con -> PresentScore(14), Int_ -> PresentScore(8), Wis -> PresentScore(10), Cha -> PresentScore(12)),
    }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Int_, plusOne: Wis })),
    species: HasSpecies(Elf),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices(${WIZARD_SCHOLAR_CHOICES_QUINT}),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("gold"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(8),
      loadout: HasLoadout(EMPTY_LOADOUT),
    }),
    spellcasting: HasSpellcastingChoices(EMPTY_SPELLCASTING_CHOICES.with(
      "wizard",
      HasSpellcastingEntry({
        cantrips: HasStringList(["fire_bolt", "light", "mage_hand"]),
        preparedSpells: HasStringList(["burning_hands", "charm_person", "detect_magic", "identify", "magic_missile"]),
        spellbook: HasStringList(["burning_hands", "charm_person", "detect_magic", "identify", "magic_missile", "shield", "sleep", "thunderwave"]),
      })
    )),
  }`,
      finalAssertions: [
        "assert(sheet.classLevels.get(Wizard) == 2)",
        "assert(sheet.choices.expertiseSkills == HasSkillList([Investigation]))",
      ],
    },
    {
      name: "wizard_level_two_scholar_rejects_non_scholar_expertise",
      draft: completeDraft({
        primaryClass: "wizard",
        advancement: [advancementEntry("wizard"), advancementEntry("wizard")],
        classLevels: { wizard: 2 },
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        choices: {
          primaryClassSkills: ["investigation", "medicine"],
          speciesSkill: "perception",
          expertiseSkills: ["perception"],
        },
        equipment: {
          backgroundOption: "package",
          classOption: "gold",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {},
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
            ],
            spellbook: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
              "shield",
              "sleep",
              "thunderwave",
            ],
          },
        },
      }),
      quintDraft: `{
    primaryClass: HasPrimaryClass(Wizard),
    classLevels: HasClassLevels(singleClassLevels(Wizard, 2)),
    advancement: HasAdvancement([
      { className: Wizard, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
      { className: Wizard, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
    ]),
    background: HasBackground(Sage),
    abilityScoreGeneration: HasAbilityScoreGeneration({
      mode: StandardArray,
      assignedScores: Map(Str -> PresentScore(15), Dex -> PresentScore(13), Con -> PresentScore(14), Int_ -> PresentScore(8), Wis -> PresentScore(10), Cha -> PresentScore(12)),
    }),
    backgroundAbilityScoreIncrease: HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: Int_, plusOne: Wis })),
    species: HasSpecies(Elf),
    languages: HasLanguages([Common, Dwarvish, Elvish]),
    alignment: HasAlignment(NG),
    choices: HasBuildChoices({
      ${WIZARD_SCHOLAR_CHOICES_QUINT.slice(8, -1).replace("HasSkillList([Investigation])", "HasSkillList([Perception])")}
    }),
    equipment: HasEquipmentChoices({
      backgroundOption: HasString("package"),
      classOption: HasString("gold"),
      purchasedCombatEquipment: [],
      remainingGoldPieces: HasInt(8),
      loadout: HasLoadout(EMPTY_LOADOUT),
    }),
    spellcasting: HasSpellcastingChoices(EMPTY_SPELLCASTING_CHOICES.with(
      "wizard",
      HasSpellcastingEntry({
        cantrips: HasStringList(["fire_bolt", "light", "mage_hand"]),
        preparedSpells: HasStringList(["burning_hands", "charm_person", "detect_magic", "identify", "magic_missile"]),
        spellbook: HasStringList(["burning_hands", "charm_person", "detect_magic", "identify", "magic_missile", "shield", "sleep", "thunderwave"]),
      })
    )),
  }`,
    },
  ] as const;

  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const tempDir = fs.mkdtempSync(
    path.join(
      repoRoot,
      `.tmp-character-creation-parity-${os.userInfo().username}-`,
    ),
  );
  const tempFile = path.join(tempDir, "character-creation-parity.qnt");

  try {
    const renderedCases = cases
      .map((testCase) => {
        const assessment = assessCharacterDraft(testCase.draft);
        const finalized = finalizeCharacterDraft(testCase.draft);
        const status =
          assessment.status === "complete"
            ? "DraftComplete"
            : assessment.status === "incomplete"
              ? "DraftIncomplete"
              : "DraftInvalid";
        const openSet = renderIssueSet(
          assessment.openChoices.map((choice) => choice.code),
        );
        const illegalSet = renderIssueSet(
          assessment.issues.map((issue) => issue.code),
        );

        const finalizerRun = finalized.ok
          ? `  run parity_finalize_${testCase.name} = {
    match pFinalizeDraft(${testCase.name}_draft) {
      | Finalized(sheet) =>
          all {
            ${testCase.finalAssertions?.join(",\n            ") ?? "assert(true)"}
          }
      | Blocked(_) => assert(false)
    }
    }`
          : `  run parity_finalize_${testCase.name} = {
    match pFinalizeDraft(${testCase.name}_draft) {
      | Finalized(_) => assert(false)
      | Blocked(blocked) =>
          all {
            assert(blocked.openChoices == ${openSet}),
            assert(blocked.illegalIssues == ${illegalSet}),
          }
    }
    }`;

        return `  pure val ${testCase.name}_draft: CharacterDraft = ${testCase.quintDraft}

  run parity_status_${testCase.name} = {
    val open = pOpenChoiceIssues(${testCase.name}_draft)
    val illegal = pIllegalIssues(${testCase.name}_draft)
    all {
      assert(pDraftStatus(${testCase.name}_draft) == ${status}),
      assert(open == ${openSet}),
      assert(illegal == ${illegalSet}),
    }
  }

${finalizerRun}`;
      })
      .join("\n\n");

    fs.writeFileSync(
      tempFile,
      `module characterCreationParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"

${renderedCases}
}
`,
    );

    const output = execFileSync(
      "npx",
      [
        "quint",
        "test",
        "--backend",
        "typescript",
        tempFile,
        "--match",
        "parity_",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    assert.match(output, /passed/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runCharacterCreationQuintParity();
