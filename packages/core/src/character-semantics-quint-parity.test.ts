import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { Match } from "effect";
import { describe, expect, it } from "vitest";

import {
  assessCharacterDraft,
  advanceCharacterSheet,
  characterDraftFromSheet,
  finalizeCharacterDraft,
  previewCharacterDraftUpdate,
  previewCharacterSheetAdvancement,
  singleClassAdvancement,
  type CharacterDraft,
} from "#/character-domain.ts";
import type { CharacterSheet } from "#/character-domain-model.ts";
import {
  ARTISAN_TOOLS,
  CHARACTER_RARE_LANGUAGES,
  FIXED_TOOL_PROFICIENCIES,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  type CharacterAdvancementEntry,
  type CharacterAdvancementFeatSelection,
  type CharacterBuildChoices,
  type CharacterGrantedLanguage,
  type CharacterOriginFeatSelection,
  type CharacterSkilledProficiencyChoice,
  type CharacterSubclassSelection,
  type CharacterToolProficiency,
} from "#/character-feature-types.ts";
import type { Skill } from "#/character-proficiencies.ts";
import { characterSheetCreatureProjection } from "#/character-sheet-creature-projection.ts";
import type { CharacterCreatureProjection } from "#/character-sheet-creature-projection.ts";
import type { CharacterLevelUpTransition } from "#/character-sheet-advancement.ts";
import type {
  CharacterSpellcastingChoices,
  CharacterSpellcastingEntry,
} from "#/character-spellcasting.ts";
import type { FightingStyle } from "#/features/class-fighter.ts";
import type { ClassName } from "#/features/class-tables.ts";
import {
  ABILITIES,
  type Ability,
  type ArmorCategory,
  type Size,
  type UnarmoredDefense,
} from "#/types.ts";

const execFileAsync = promisify(execFile);

const alertFeat = {
  slot: "feat",
  choice: { tag: "feat", featId: "alert" },
} as const;

function advancementEntry(
  className: ClassName,
  entry: Omit<CharacterAdvancementEntry, "className"> = {},
): CharacterAdvancementEntry {
  return { className, ...entry };
}

function completeFighterDraft(
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

function completeWizardDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return completeFighterDraft({
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
    ...overrides,
  });
}

function completeMulticlassDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return {
    primaryClass: "paladin",
    advancement: [
      advancementEntry("paladin"),
      advancementEntry("paladin"),
      advancementEntry("paladin", {
        subclass: { className: "paladin", subclass: "devotion" },
      }),
      advancementEntry("bard"),
      advancementEntry("bard"),
      advancementEntry("bard", {
        subclass: { className: "bard", subclass: "lore" },
      }),
      advancementEntry("bard", { feat: alertFeat }),
      advancementEntry("bard"),
      advancementEntry("cleric"),
      advancementEntry("cleric"),
      advancementEntry("ranger"),
      advancementEntry("ranger"),
      advancementEntry("ranger", {
        subclass: { className: "ranger", subclass: "hunter" },
      }),
      advancementEntry("ranger", { feat: alertFeat }),
      advancementEntry("ranger"),
      advancementEntry("ranger"),
      advancementEntry("sorcerer"),
      advancementEntry("sorcerer"),
      advancementEntry("warlock"),
      advancementEntry("warlock"),
    ],
    background: "acolyte",
    abilityScoreGeneration: {
      mode: "randomGeneration",
      assignedScores: {
        str: 15,
        dex: 13,
        con: 8,
        int: 10,
        wis: 13,
        cha: 13,
      },
    },
    backgroundAbilityScoreIncrease: {
      kind: "plusOneToThree",
    },
    species: "human",
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: "LG",
    choices: {
      primaryClassSkills: ["athletics", "persuasion"],
      speciesSkill: "perception",
      humanOriginFeat: { feat: "alert" },
      clericDivineOrder: "protector",
      multiclassSkills: {
        bard: ["history"],
        ranger: ["survival"],
      },
      multiclassBardInstrument: "lute",
      paladinFightingStyle: "defense",
      rangerFightingStyle: "archery",
      rangerDeftExplorerLanguages: ["Sylvan", "Primordial"],
      expertiseSkills: ["history", "survival", "perception"],
    },
    spellcasting: {
      bard: {
        cantrips: ["mage_hand", "minor_illusion", "vicious_mockery"],
        preparedSpells: [
          "charm_person",
          "cure_wounds",
          "detect_magic",
          "healing_word",
          "identify",
          "sleep",
          "speak_with_animals",
          "suggestion",
          "thunderwave",
        ],
      },
      cleric: {
        cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
        preparedSpells: [
          "bless",
          "cure_wounds",
          "detect_magic",
          "guiding_bolt",
          "healing_word",
        ],
      },
      paladin: {
        preparedSpells: ["bless", "cure_wounds", "detect_magic", "heroism"],
      },
      ranger: {
        preparedSpells: [
          "aid",
          "cure_wounds",
          "detect_magic",
          "longstrider",
          "speak_with_animals",
          "spike_growth",
        ],
      },
      sorcerer: {
        cantrips: ["fire_bolt", "light", "mage_hand", "minor_illusion"],
        preparedSpells: [
          "burning_hands",
          "charm_person",
          "detect_magic",
          "magic_missile",
        ],
      },
      warlock: {
        cantrips: ["eldritch_blast", "mage_hand"],
        preparedSpells: ["charm_person", "detect_magic", "speak_with_animals"],
      },
    },
    equipment: {
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 17,
      loadout: {
        wornArmor: "chainMail",
        wieldedWeapon: "longsword",
        shield: true,
        wieldedWeaponGrip: "oneHanded",
      },
    },
    ...overrides,
  };
}

function toQuintPascal(value: string): string {
  return value
    .replace(/['’]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

function renderString(value: string): string {
  return JSON.stringify(value);
}

function renderStringList(values: ReadonlyArray<string>): string {
  return `[${values.map(renderString).join(", ")}]`;
}

function renderOptionalString(value: string | undefined): string {
  return value == null ? "NoString" : `HasString(${renderString(value)})`;
}

function renderIssueSet(codes: ReadonlyArray<string>): string {
  if (codes.length === 0) return "Set()";
  return `Set(${[...codes].sort().map(toQuintPascal).join(", ")})`;
}

function renderClassName(className: ClassName): string {
  return toQuintPascal(className);
}

function renderAbility(ability: Ability): string {
  return ability === "int" ? "Int_" : toQuintPascal(ability);
}

function renderBackground(
  background: NonNullable<CharacterDraft["background"]>,
): string {
  return toQuintPascal(background);
}

function renderSpecies(
  species: NonNullable<CharacterDraft["species"]>,
): string {
  return toQuintPascal(species);
}

function renderAlignment(
  alignment: NonNullable<CharacterDraft["alignment"]>,
): string {
  return alignment;
}

function renderLanguage(language: string): string {
  return toQuintPascal(language);
}

function renderSkill(skill: Skill): string {
  return toQuintPascal(skill);
}

function renderFightingStyle(style: FightingStyle): string {
  return Match.value(style).pipe(
    Match.when("archery", () => "FSArchery"),
    Match.when("defense", () => "FSDefense"),
    Match.when("greatWeaponFighting", () => "FSGreatWeaponFighting"),
    Match.when("twoWeaponFighting", () => "FSTwoWeaponFighting"),
    Match.exhaustive,
  );
}

function renderSubclassSelection(
  selection: CharacterSubclassSelection,
): string {
  return `{ className: ${renderClassName(selection.className)}, subclass: ${renderString(selection.subclass)} }`;
}

function renderArmorCategory(category: ArmorCategory): string {
  return `${toQuintPascal(category)}Armor`;
}

function renderSize(size: Size): string {
  return toQuintPascal(size);
}

function renderUnarmoredDefense(unarmoredDefense: UnarmoredDefense): string {
  switch (unarmoredDefense) {
    case "none":
      return "NoUnarmoredDefense";
    case "barbarian":
      return "BarbarianUD";
    case "monk":
      return "MonkUD";
  }
}

function renderFeature(feature: string): string {
  switch (feature) {
    case "extraAttack":
      return "FExtraAttack";
    case "extraAttack2":
      return "FExtraAttack2";
    case "extraAttack3":
      return "FExtraAttack3";
    default:
      throw new Error(`Unsupported projection feature ${feature}`);
  }
}

function renderClassLevels(
  classLevels: Readonly<Partial<Record<ClassName, number>>>,
): string {
  const nonZeroLevels = Object.entries(classLevels).filter(
    (entry): entry is [ClassName, number] => entry[1] != null && entry[1] > 0,
  );

  if (nonZeroLevels.length === 0) return "ZERO_CLASS_LEVELS";
  if (nonZeroLevels.length === 1) {
    const [className, level] = nonZeroLevels[0]!;
    return `singleClassLevels(${renderClassName(className)}, ${level})`;
  }

  return nonZeroLevels.reduce(
    (expr, [className, level]) =>
      `${expr}.set(${renderClassName(className)}, ${level})`,
    "ZERO_CLASS_LEVELS",
  );
}

function renderAssignedScores(
  scores: NonNullable<
    CharacterDraft["abilityScoreGeneration"]
  >["assignedScores"],
): string {
  return `Map(${ABILITIES.map((ability) => `${renderAbility(ability)} -> PresentScore(${scores[ability]!})`).join(", ")})`;
}

function renderAbilityScoreGeneration(
  generation: NonNullable<CharacterDraft["abilityScoreGeneration"]>,
): string {
  const mode =
    generation.mode === "standardArray"
      ? "StandardArray"
      : generation.mode === "randomGeneration"
        ? "RandomGeneration"
        : "PointBuy";
  return `HasAbilityScoreGeneration({ mode: ${mode}, assignedScores: ${renderAssignedScores(generation.assignedScores)} })`;
}

function renderBackgroundAbilityScoreIncrease(
  increase: NonNullable<CharacterDraft["backgroundAbilityScoreIncrease"]>,
): string {
  if (increase.kind === "plusOneToThree") {
    return "HasBackgroundAbilityScoreIncrease(PlusOneToThree)";
  }

  return `HasBackgroundAbilityScoreIncrease(PlusTwoPlusOne({ plusTwo: ${renderAbility(increase.plusTwo)}, plusOne: ${renderAbility(increase.plusOne)} }))`;
}

function renderToolProficiency(tool: CharacterToolProficiency): string {
  if ((ARTISAN_TOOLS as ReadonlyArray<string>).includes(tool)) {
    return `ArtisanToolProficiency(${toQuintPascal(tool)})`;
  }
  if ((GAMING_SETS as ReadonlyArray<string>).includes(tool)) {
    return `GamingSetProficiency(${toQuintPascal(tool)})`;
  }
  if ((MUSICAL_INSTRUMENTS as ReadonlyArray<string>).includes(tool)) {
    return `MusicalInstrumentProficiency(${toQuintPascal(tool)})`;
  }
  if ((FIXED_TOOL_PROFICIENCIES as ReadonlyArray<string>).includes(tool)) {
    return toQuintPascal(tool);
  }
  throw new Error(`Unsupported tool proficiency ${tool}`);
}

function renderSkilledProficiencyChoice(
  choice: CharacterSkilledProficiencyChoice,
): string {
  if (
    (ARTISAN_TOOLS as ReadonlyArray<string>).includes(choice) ||
    (GAMING_SETS as ReadonlyArray<string>).includes(choice) ||
    (MUSICAL_INSTRUMENTS as ReadonlyArray<string>).includes(choice) ||
    (FIXED_TOOL_PROFICIENCIES as ReadonlyArray<string>).includes(choice)
  ) {
    return `SkilledTool(${renderToolProficiency(choice as CharacterToolProficiency)})`;
  }
  return `SkilledSkill(${renderSkill(choice as Skill)})`;
}

function renderOriginFeatSelection(
  selection: CharacterOriginFeatSelection,
): string {
  if (selection.feat === "skilled") {
    return `OriginSkilled([${selection.proficiencies.map(renderSkilledProficiencyChoice).join(", ")}])`;
  }

  return `Origin${toQuintPascal(selection.feat)}`;
}

function renderAdvancementFeatSelection(
  selection: CharacterAdvancementFeatSelection | undefined,
): string {
  if (selection == null) return "NoAdvancementFeatSelection";

  const slot = selection.slot === "feat" ? "FeatSlot" : "EpicBoonSlot";
  const choice = (() => {
    switch (selection.choice.tag) {
      case "abilityScoreImprovement":
        return `AbilityScoreImprovement([${selection.choice.abilities.map(renderAbility).join(", ")}])`;
      case "feat":
        return `AdvancementFeat({
            featId: ${renderString(selection.choice.featId)},
            abilityScoreIncrease: ${
              selection.choice.abilityScoreIncrease == null
                ? "NoAbility"
                : `HasAbility(${renderAbility(selection.choice.abilityScoreIncrease)})`
            },
            proficiencies: ${
              selection.choice.proficiencies == null
                ? "NoSkilledProficiencyChoices"
                : `HasSkilledProficiencyChoices([${selection.choice.proficiencies.map(renderSkilledProficiencyChoice).join(", ")}])`
            },
          })`;
      case "epicBoon":
        return `EpicBoonFeat({
            featId: ${renderString(selection.choice.featId)},
            abilityScoreIncrease: ${
              selection.choice.abilityScoreIncrease == null
                ? "NoAbility"
                : `HasAbility(${renderAbility(selection.choice.abilityScoreIncrease)})`
            },
            proficiencies: ${
              selection.choice.proficiencies == null
                ? "NoSkilledProficiencyChoices"
                : `HasSkilledProficiencyChoices([${selection.choice.proficiencies.map(renderSkilledProficiencyChoice).join(", ")}])`
            },
          })`;
    }
  })();

  return `HasAdvancementFeatSelection({ slot: ${slot}, choice: ${choice} })`;
}

function renderAdvancementEntry(entry: CharacterAdvancementEntry): string {
  return `{
      className: ${renderClassName(entry.className)},
      subclass: ${
        entry.subclass == null
          ? "NoSubclassSelection"
          : `HasSubclassSelection(${renderSubclassSelection(entry.subclass)})`
      },
      feat: ${renderAdvancementFeatSelection(entry.feat)},
    }`;
}

function renderAdvancement(advancement: CharacterDraft["advancement"]): string {
  if (advancement == null) return "NoAdvancement";
  return `HasAdvancement([${advancement.map(renderAdvancementEntry).join(", ")}])`;
}

function renderMulticlassSkills(
  multiclassSkills: NonNullable<CharacterBuildChoices["multiclassSkills"]>,
): string {
  const patches = Object.entries(multiclassSkills)
    .filter(
      (entry): entry is ["bard" | "ranger" | "rogue", ReadonlyArray<Skill>] =>
        entry[1] != null,
    )
    .map(
      ([className, skills]) =>
        `.with(${renderString(className)}, HasSkillList([${skills.map(renderSkill).join(", ")}]))`,
    )
    .join("");
  return `HasMulticlassSkills(EMPTY_MULTICLASS_SKILLS${patches})`;
}

function renderGrantedLanguage(language: CharacterGrantedLanguage): string {
  const rendered = toQuintPascal(language);
  return CHARACTER_RARE_LANGUAGES.includes(language as never)
    ? `RareGrantedLanguage(${rendered})`
    : `StandardGrantedLanguage(${rendered})`;
}

function renderBuildChoicesValue(
  choices: Partial<CharacterBuildChoices>,
): string {
  const patches: string[] = [];

  if (choices.primaryClassSkills != null) {
    patches.push(
      `.with("primaryClassSkills", HasSkillList([${choices.primaryClassSkills.map(renderSkill).join(", ")}]))`,
    );
  }
  if (choices.multiclassSkills != null) {
    patches.push(
      `.with("multiclassSkills", ${renderMulticlassSkills(choices.multiclassSkills)})`,
    );
  }
  if (choices.backgroundTool != null) {
    patches.push(
      `.with("backgroundTool", HasGamingSet(${toQuintPascal(choices.backgroundTool)}))`,
    );
  }
  if (choices.bardInstruments != null) {
    patches.push(
      `.with("bardInstruments", HasMusicalInstrumentList([${choices.bardInstruments.map(toQuintPascal).join(", ")}]))`,
    );
  }
  if (choices.multiclassBardInstrument != null) {
    patches.push(
      `.with("multiclassBardInstrument", HasMusicalInstrument(${toQuintPascal(choices.multiclassBardInstrument)}))`,
    );
  }
  if (choices.monkTool != null) {
    patches.push(
      `.with("monkTool", HasMonkTool(${renderToolProficiency(choices.monkTool)}))`,
    );
  }
  if (choices.speciesSkill != null) {
    patches.push(
      `.with("speciesSkill", HasSkill(${renderSkill(choices.speciesSkill)}))`,
    );
  }
  if (choices.humanOriginFeat != null) {
    patches.push(
      `.with("humanOriginFeat", HasOriginFeatSelection(${renderOriginFeatSelection(choices.humanOriginFeat)}))`,
    );
  }
  if (choices.rogueLanguage != null) {
    patches.push(
      `.with("rogueLanguage", HasGrantedLanguage(${renderGrantedLanguage(choices.rogueLanguage)}))`,
    );
  }
  if (choices.rangerDeftExplorerLanguages != null) {
    patches.push(
      `.with("rangerDeftExplorerLanguages", HasGrantedLanguageList([${choices.rangerDeftExplorerLanguages.map(renderGrantedLanguage).join(", ")}]))`,
    );
  }
  if (choices.clericDivineOrder != null) {
    patches.push(
      `.with("clericDivineOrder", HasString(${renderString(choices.clericDivineOrder)}))`,
    );
  }
  if (choices.druidPrimalOrder != null) {
    patches.push(
      `.with("druidPrimalOrder", HasString(${renderString(choices.druidPrimalOrder)}))`,
    );
  }
  if (choices.fighterFightingStyle != null) {
    patches.push(
      `.with("fighterFightingStyle", HasFightingStyleFeat(${renderFightingStyle(choices.fighterFightingStyle)}))`,
    );
  }
  if (choices.championAdditionalFightingStyle != null) {
    patches.push(
      `.with("championAdditionalFightingStyle", HasFightingStyleFeat(${renderFightingStyle(choices.championAdditionalFightingStyle)}))`,
    );
  }
  if (choices.paladinFightingStyle != null) {
    patches.push(
      `.with("paladinFightingStyle", HasPaladinFightingStyleChoice(${
        choices.paladinFightingStyle === "blessedWarrior"
          ? "BlessedWarrior"
          : `PaladinFightingStyleFeat(${renderFightingStyle(choices.paladinFightingStyle)})`
      }))`,
    );
  }
  if (choices.rangerFightingStyle != null) {
    patches.push(
      `.with("rangerFightingStyle", HasRangerFightingStyleChoice(${
        choices.rangerFightingStyle === "druidicWarrior"
          ? "DruidicWarrior"
          : `RangerFightingStyleFeat(${renderFightingStyle(choices.rangerFightingStyle)})`
      }))`,
    );
  }
  if (choices.expertiseSkills != null) {
    patches.push(
      `.with("expertiseSkills", HasSkillList([${choices.expertiseSkills.map(renderSkill).join(", ")}]))`,
    );
  }

  return `EMPTY_BUILD_CHOICES${patches.join("")}`;
}

function renderBuildChoices(choices: CharacterDraft["choices"]): string {
  return choices == null
    ? "NoBuildChoices"
    : `HasBuildChoices(${renderBuildChoicesValue(choices)})`;
}

function renderLoadout(
  loadout: NonNullable<NonNullable<CharacterDraft["equipment"]>["loadout"]>,
): string {
  const patches: string[] = [];

  if (loadout.wornArmor != null) {
    patches.push(
      `.with("wornArmor", HasString(${renderString(loadout.wornArmor)}))`,
    );
  }
  if (loadout.wieldedWeapon != null) {
    patches.push(
      `.with("wieldedWeapon", HasString(${renderString(loadout.wieldedWeapon)}))`,
    );
  }
  if (loadout.secondaryWeapon != null) {
    patches.push(
      `.with("secondaryWeapon", HasString(${renderString(loadout.secondaryWeapon)}))`,
    );
  }
  if (loadout.shield != null) {
    patches.push(`.with("shield", HasBool(${loadout.shield}))`);
  }
  if (loadout.wieldedWeaponGrip != null) {
    const grip =
      loadout.wieldedWeaponGrip === "oneHanded"
        ? "OneHandedGrip"
        : "TwoHandedGrip";
    patches.push(`.with("wieldedWeaponGrip", ${grip})`);
  }

  return `EMPTY_LOADOUT${patches.join("")}`;
}

function renderEquipmentChoices(
  equipment: CharacterDraft["equipment"],
): string {
  if (equipment == null) return "NoEquipmentChoices";

  return `HasEquipmentChoices({
      backgroundOption: ${renderOptionalString(equipment.backgroundOption)},
      classOption: ${renderOptionalString(equipment.classOption)},
      purchasedCombatEquipment: ${renderStringList(equipment.purchasedCombatEquipment ?? [])},
      remainingGoldPieces: ${
        equipment.remainingGoldPieces == null
          ? "NoInt"
          : `HasInt(${equipment.remainingGoldPieces})`
      },
      loadout: ${
        equipment.loadout == null
          ? "NoLoadout"
          : `HasLoadout(${renderLoadout(equipment.loadout)})`
      },
    })`;
}

function renderSpellcastingEntry(entry: CharacterSpellcastingEntry): string {
  return `HasSpellcastingEntry({
        cantrips: ${
          entry.cantrips == null
            ? "NoStringList"
            : `HasStringList(${renderStringList(entry.cantrips)})`
        },
        preparedSpells: ${
          entry.preparedSpells == null
            ? "NoStringList"
            : `HasStringList(${renderStringList(entry.preparedSpells)})`
        },
        spellbook: ${
          entry.spellbook == null
            ? "NoStringList"
            : `HasStringList(${renderStringList(entry.spellbook)})`
        },
      })`;
}

function renderSpellcastingChoicesValue(
  spellcasting: CharacterSpellcastingChoices,
): string {
  const patches = Object.entries(spellcasting)
    .filter(
      (entry): entry is [string, CharacterSpellcastingEntry] =>
        entry[1] != null,
    )
    .map(
      ([className, entry]) =>
        `.with(${renderString(className)}, ${renderSpellcastingEntry(entry)})`,
    )
    .join("");
  return `EMPTY_SPELLCASTING_CHOICES${patches}`;
}

function renderSpellcastingChoices(
  spellcasting: CharacterDraft["spellcasting"],
): string {
  return spellcasting == null
    ? "NoSpellcastingChoices"
    : `HasSpellcastingChoices(${renderSpellcastingChoicesValue(spellcasting)})`;
}

function renderDraft(draft: CharacterDraft): string {
  return `{
    primaryClass: ${
      draft.primaryClass == null
        ? "NoPrimaryClass"
        : `HasPrimaryClass(${renderClassName(draft.primaryClass)})`
    },
    classLevels: ${
      draft.classLevels == null
        ? "NoClassLevels"
        : `HasClassLevels(${renderClassLevels(draft.classLevels)})`
    },
    advancement: ${renderAdvancement(draft.advancement)},
    background: ${
      draft.background == null
        ? "NoBackground"
        : `HasBackground(${renderBackground(draft.background)})`
    },
    abilityScoreGeneration: ${
      draft.abilityScoreGeneration == null
        ? "NoAbilityScoreGeneration"
        : renderAbilityScoreGeneration(draft.abilityScoreGeneration)
    },
    backgroundAbilityScoreIncrease: ${
      draft.backgroundAbilityScoreIncrease == null
        ? "NoBackgroundAbilityScoreIncrease"
        : renderBackgroundAbilityScoreIncrease(
            draft.backgroundAbilityScoreIncrease,
          )
    },
    species: ${
      draft.species == null
        ? "NoSpecies"
        : `HasSpecies(${renderSpecies(draft.species)})`
    },
    languages: ${
      draft.languages == null
        ? "NoLanguages"
        : `HasLanguages([${draft.languages.map(renderLanguage).join(", ")}])`
    },
    alignment: ${
      draft.alignment == null
        ? "NoAlignment"
        : `HasAlignment(${renderAlignment(draft.alignment)})`
    },
    choices: ${renderBuildChoices(draft.choices)},
    equipment: ${renderEquipmentChoices(draft.equipment)},
    spellcasting: ${renderSpellcastingChoices(draft.spellcasting)},
  }`;
}

function renderTransition(transition: CharacterLevelUpTransition): string {
  return `{
    entry: ${renderAdvancementEntry(transition.entry)},
    choices: ${renderBuildChoicesValue(transition.choices ?? {})},
    spellcasting: ${renderSpellcastingChoices(transition.spellcasting)},
  }`;
}

function renderSubclassSelections(
  subclasses: CharacterCreatureProjection["subclasses"],
): string {
  return `[${subclasses.map(renderSubclassSelection).join(", ")}]`;
}

function renderSet<T>(
  values: ReadonlyArray<T>,
  render: (value: T) => string,
): string {
  if (values.length === 0) return "Set()";
  return `Set(${[...values].map(render).sort().join(", ")})`;
}

function renderProjectionAssertions(
  projection: CharacterCreatureProjection,
): string {
  const classLevelAssertions = Object.entries(projection.classLevels)
    .filter((entry): entry is [ClassName, number] => entry[1] > 0)
    .map(
      ([className, level]) =>
        `assert(projection.classLevels.get(${renderClassName(className)}) == ${level})`,
    );
  const abilityAssertions = ABILITIES.map(
    (ability) =>
      `assert(projection.abilityScores.get(${renderAbility(ability)}) == ${projection.abilityScores[ability]})`,
  );

  return [
    `assert(projection.primaryClass == ${renderClassName(projection.primaryClass)})`,
    `assert(projection.subclasses == ${renderSubclassSelections(projection.subclasses)})`,
    `assert(projection.species == ${renderSpecies(projection.species)})`,
    ...classLevelAssertions,
    ...abilityAssertions,
    `assert(projection.fightingStyles == ${renderSet([...projection.fightingStyles], renderFightingStyle)})`,
    `assert(projection.creatureSize == ${renderSize(projection.creatureSize)})`,
    `assert(projection.baseWalkSpeed == ${projection.baseWalkSpeed})`,
    `assert(projection.saveProficiencies == ${renderSet([...projection.saveProficiencies], renderAbility)})`,
    `assert(projection.skillProficiencies == ${renderSet([...projection.skillProficiencies], renderSkill)})`,
    `assert(projection.expertiseSkills == ${renderSet([...projection.expertiseSkills], renderSkill)})`,
    `assert(projection.armorProficiencies == ${renderSet([...projection.armorProficiencies], renderArmorCategory)})`,
    `assert(projection.hitDieType == ${projection.hitDieType})`,
    `assert(projection.spellcastingAbility == ${renderAbility(projection.spellcastingAbility)})`,
    `assert(projection.hasSpellcasting == ${projection.hasSpellcasting})`,
    `assert(projection.unarmoredDefense == ${renderUnarmoredDefense(projection.unarmoredDefense)})`,
    `assert(projection.features == ${renderSet([...projection.features], renderFeature)})`,
    `assert(projection.critRange == ${projection.critRange})`,
    `assert(projection.hasFightingStyleFeature == ${projection.hasFightingStyleFeature})`,
  ].join(",\n            ");
}

function renderAssessmentStatus(
  status: "complete" | "incomplete" | "invalid",
): string {
  return Match.value(status).pipe(
    Match.when("complete", () => "DraftComplete"),
    Match.when("incomplete", () => "DraftIncomplete"),
    Match.when("invalid", () => "DraftInvalid"),
    Match.exhaustive,
  );
}

function renderAssessmentAssertions(
  assessmentRef: string,
  assessment: ReturnType<typeof assessCharacterDraft>,
): string {
  return [
    `assert(pDraftStatus(${assessmentRef}) == ${renderAssessmentStatus(assessment.status)})`,
    `assert(pOpenChoiceIssues(${assessmentRef}) == ${renderIssueSet(
      assessment.openChoices.map((choice) => choice.code),
    )})`,
    `assert(pIllegalIssues(${assessmentRef}) == ${renderIssueSet(
      assessment.issues.map((issue) => issue.code),
    )})`,
  ].join(",\n            ");
}

async function runQuintParityModule(body: string, stem: string): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const tempDir = fs.mkdtempSync(
    path.join(repoRoot, `.tmp-${stem}-${os.userInfo().username}-`),
  );
  const tempFile = path.join(tempDir, `${stem}.qnt`);

  try {
    fs.writeFileSync(tempFile, body);
    const { stdout, stderr } = await execFileAsync(
      "pnpm",
      [
        "exec",
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
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    assert.match(`${stdout}${stderr}`, /passed/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("character semantics Quint parity", () => {
  it(
    "keeps draft assessment and finalization aligned with Quint",
    { timeout: 120_000 },
    async () => {
      const completeDraft = completeFighterDraft();
      const completeAssessment = assessCharacterDraft(completeDraft);
      const completeFinalization = finalizeCharacterDraft(completeDraft);
      expect(completeAssessment.status).toBe("complete");
      expect(completeFinalization.ok).toBe(true);
      if (!completeFinalization.ok) {
        throw new Error("expected complete fighter draft to finalize");
      }

      const wizardLevelOne = finalizeCharacterDraft(completeWizardDraft());
      expect(wizardLevelOne.ok).toBe(true);
      if (!wizardLevelOne.ok) {
        throw new Error("expected wizard level-one sheet");
      }

      const blockedWizardDraft = characterDraftFromSheet(wizardLevelOne.sheet, {
        entry: advancementEntry("wizard"),
      });
      const blockedAssessment = assessCharacterDraft(blockedWizardDraft);
      const blockedFinalization = finalizeCharacterDraft(blockedWizardDraft);
      expect(blockedAssessment.status).toBe("invalid");
      expect(blockedFinalization.ok).toBe(false);
      if (blockedFinalization.ok) {
        throw new Error("expected blocked wizard draft finalization");
      }

      await runQuintParityModule(
        `module characterFinalizationParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"

  pure val COMPLETE_FIGHTER_DRAFT: CharacterDraft = ${renderDraft(completeDraft)}
  pure val BLOCKED_WIZARD_DRAFT: CharacterDraft = ${renderDraft(blockedWizardDraft)}

  run parity_complete_fighter_draft_matches_ts = {
    val open = pOpenChoiceIssues(COMPLETE_FIGHTER_DRAFT)
    val illegal = pIllegalIssues(COMPLETE_FIGHTER_DRAFT)
    match pFinalizeDraft(COMPLETE_FIGHTER_DRAFT) {
      | Finalized(sheet) =>
          all {
            assert(open == ${renderIssueSet(completeAssessment.openChoices.map((choice) => choice.code))}),
            assert(illegal == ${renderIssueSet(completeAssessment.issues.map((issue) => issue.code))}),
            assert(sheet.primaryClass == ${renderClassName(completeFinalization.sheet.primaryClass)}),
            assert(sheet.advancement.length() == ${completeFinalization.sheet.advancement.length}),
            assert(sheet.abilityScores.get(Str) == ${completeFinalization.sheet.abilityScores.str}),
            assert(sheet.abilityScores.get(Con) == ${completeFinalization.sheet.abilityScores.con}),
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_blocked_wizard_draft_matches_ts = {
    val open = pOpenChoiceIssues(BLOCKED_WIZARD_DRAFT)
    val illegal = pIllegalIssues(BLOCKED_WIZARD_DRAFT)
    match pFinalizeDraft(BLOCKED_WIZARD_DRAFT) {
      | Finalized(_) => assert(false)
      | Blocked(blocked) =>
          all {
            assert(open == ${renderIssueSet(blockedAssessment.openChoices.map((choice) => choice.code))}),
            assert(illegal == ${renderIssueSet(blockedAssessment.issues.map((issue) => issue.code))}),
            assert(blocked.openChoices == ${renderIssueSet(blockedAssessment.openChoices.map((choice) => choice.code))}),
            assert(blocked.illegalIssues == ${renderIssueSet(blockedAssessment.issues.map((issue) => issue.code))}),
          }
    }
  }
}
`,
        "character-finalization-parity",
      );
    },
  );

  it(
    "keeps draft-edit and level-up previews aligned with Quint-owned candidate draft semantics",
    { timeout: 240_000 },
    async () => {
      const draftPreview = previewCharacterDraftUpdate(completeFighterDraft(), {
        primaryClass: "wizard",
        background: "acolyte",
        species: "dwarf",
      });

      const fighterLevelOne = finalizeCharacterDraft(completeFighterDraft());
      expect(fighterLevelOne.ok).toBe(true);
      if (!fighterLevelOne.ok) {
        throw new Error("expected fighter level-one sheet");
      }
      const fighterLevelTwo = advanceCharacterSheet(fighterLevelOne.sheet, {
        entry: advancementEntry("fighter"),
      });
      expect(fighterLevelTwo.ok).toBe(true);
      if (!fighterLevelTwo.ok) {
        throw new Error("expected fighter level-two sheet");
      }

      const advancementPreview = previewCharacterSheetAdvancement(
        fighterLevelTwo.sheet,
        {
          entry: advancementEntry("fighter"),
        },
      );

      const multiclassSheet = finalizeCharacterDraft(completeMulticlassDraft());
      expect(multiclassSheet.ok).toBe(true);
      if (!multiclassSheet.ok) {
        throw new Error("expected multiclass sheet");
      }
      const multiclassPreview = previewCharacterSheetAdvancement(
        multiclassSheet.sheet,
        {
          entry: advancementEntry("rogue"),
          choices: {
            multiclassSkills: {
              rogue: ["stealth"],
            },
          },
        },
      );

      const wizardSheet = finalizeCharacterDraft(completeWizardDraft());
      expect(wizardSheet.ok).toBe(true);
      if (!wizardSheet.ok) {
        throw new Error("expected wizard sheet");
      }
      const wizardPreparedOnlyTransition: CharacterLevelUpTransition = {
        entry: advancementEntry("wizard"),
        spellcasting: {
          wizard: {
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "magic_missile",
              "shield",
            ],
          },
        },
      };
      const wizardPreview = previewCharacterSheetAdvancement(
        wizardSheet.sheet,
        wizardPreparedOnlyTransition,
      );

      await runQuintParityModule(
        `module characterDraftPreviewParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"

  pure val DRAFT_PREVIEW_CANDIDATE: CharacterDraft = ${renderDraft(draftPreview.candidateDraft)}

  run parity_draft_preview_candidate_matches_ts = {
    all {
            ${renderAssessmentAssertions(
              "DRAFT_PREVIEW_CANDIDATE",
              draftPreview.candidateAssessment,
            )}
    }
  }
}
`,
        "character-draft-preview-parity",
      );

      await runQuintParityModule(
        `module characterAdvancementPreviewParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"

  pure val ADVANCEMENT_PREVIEW_CANDIDATE: CharacterDraft = ${renderDraft(advancementPreview.candidateDraft)}

  run parity_advancement_preview_candidate_matches_ts = {
    all {
            ${renderAssessmentAssertions(
              "ADVANCEMENT_PREVIEW_CANDIDATE",
              advancementPreview.candidateAssessment,
            )}
    }
  }
}
`,
        "character-advancement-preview-parity",
      );

      expect(
        multiclassPreview.candidateDraft.choices?.multiclassSkills,
      ).toEqual({
        bard: ["history"],
        ranger: ["survival"],
        rogue: ["stealth"],
      });
      expect(wizardPreview.candidateDraft.spellcasting?.wizard).toEqual({
        cantrips: ["fire_bolt", "light", "mage_hand"],
        preparedSpells: [
          "burning_hands",
          "charm_person",
          "detect_magic",
          "magic_missile",
          "shield",
        ],
        spellbook: [
          "burning_hands",
          "charm_person",
          "detect_magic",
          "magic_missile",
          "identify",
          "sleep",
        ],
      });

      await runQuintParityModule(
        `module characterPreviewMergeParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"
  import character.* from "../character"

  pure val COMPLETE_MULTICLASS_DRAFT: CharacterDraft = ${renderDraft(completeMulticlassDraft())}
  pure val COMPLETE_WIZARD_DRAFT: CharacterDraft = ${renderDraft(completeWizardDraft())}
  pure val LEVEL_UP_ROGUE_PATCH: CharacterLevelUpTransition = ${renderTransition(
    {
      entry: advancementEntry("rogue"),
      choices: {
        multiclassSkills: {
          rogue: ["stealth"],
        },
      },
    },
  )}
  pure val LEVEL_UP_WIZARD_PREPARED_ONLY: CharacterLevelUpTransition = ${renderTransition(wizardPreparedOnlyTransition)}

  run parity_advancement_preview_multiclass_merge_matches_ts = {
    match pFinalizeDraft(COMPLETE_MULTICLASS_DRAFT) {
      | Finalized(sheet) =>
          match pDraftFromSheetTransition(sheet, LEVEL_UP_ROGUE_PATCH).choices {
            | HasBuildChoices(choices) =>
                assert(choices.multiclassSkills == ${renderMulticlassSkills({
                  bard: ["history"],
                  ranger: ["survival"],
                  rogue: ["stealth"],
                })})
            | _ => assert(false)
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_advancement_preview_spellcasting_merge_matches_ts = {
    match pFinalizeDraft(COMPLETE_WIZARD_DRAFT) {
      | Finalized(sheet) =>
          match pDraftFromSheetTransition(sheet, LEVEL_UP_WIZARD_PREPARED_ONLY).spellcasting {
            | HasSpellcastingChoices(spellcasting) =>
                assert(spellcasting.wizard == ${renderSpellcastingEntry({
                  cantrips: ["fire_bolt", "light", "mage_hand"],
                  preparedSpells: [
                    "burning_hands",
                    "charm_person",
                    "detect_magic",
                    "magic_missile",
                    "shield",
                  ],
                  spellbook: [
                    "burning_hands",
                    "charm_person",
                    "detect_magic",
                    "magic_missile",
                    "identify",
                    "sleep",
                  ],
                })})
            | _ => assert(false)
          }
      | Blocked(_) => assert(false)
    }
  }
}
`,
        "character-preview-merge-parity",
      );
    },
  );

  it(
    "keeps advancement transitions aligned with Quint",
    { timeout: 120_000 },
    async () => {
      const fighterLevelOne = finalizeCharacterDraft(completeFighterDraft());
      expect(fighterLevelOne.ok).toBe(true);
      if (!fighterLevelOne.ok) {
        throw new Error("expected fighter level-one sheet");
      }

      const fighterLevelTwoTransition: CharacterLevelUpTransition = {
        entry: advancementEntry("fighter"),
      };
      const fighterLevelTwo = advanceCharacterSheet(
        fighterLevelOne.sheet,
        fighterLevelTwoTransition,
      );
      expect(fighterLevelTwo.ok).toBe(true);
      if (!fighterLevelTwo.ok) {
        throw new Error("expected fighter level-two advancement");
      }

      const wizardLevelOne = finalizeCharacterDraft(completeWizardDraft());
      expect(wizardLevelOne.ok).toBe(true);
      if (!wizardLevelOne.ok) {
        throw new Error("expected wizard level-one sheet");
      }

      const wizardLevelTwoTransition: CharacterLevelUpTransition = {
        entry: advancementEntry("wizard"),
      };
      const wizardBlockedAssessment = assessCharacterDraft(
        characterDraftFromSheet(wizardLevelOne.sheet, wizardLevelTwoTransition),
      );
      expect(wizardBlockedAssessment.status).toBe("invalid");

      const contradictoryBase: CharacterSheet = {
        ...fighterLevelOne.sheet,
        abilityScores: { ...fighterLevelOne.sheet.abilityScores, str: 20 },
      };
      const contradictoryAdvance = advanceCharacterSheet(
        contradictoryBase,
        fighterLevelTwoTransition,
      );
      expect(contradictoryAdvance.ok).toBe(false);
      if (contradictoryAdvance.ok) {
        throw new Error("expected contradictory finalized sheet failure");
      }

      await runQuintParityModule(
        `module characterAdvancementParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"
  import character.* from "../character"

  pure val COMPLETE_FIGHTER_DRAFT: CharacterDraft = ${renderDraft(completeFighterDraft())}
  pure val COMPLETE_WIZARD_DRAFT: CharacterDraft = ${renderDraft(completeWizardDraft())}
  pure val LEVEL_UP_FIGHTER_NO_PATCH: CharacterLevelUpTransition = ${renderTransition(fighterLevelTwoTransition)}
  pure val LEVEL_UP_WIZARD_NO_PATCH: CharacterLevelUpTransition = ${renderTransition(wizardLevelTwoTransition)}

  run parity_advancement_fighter_level_two_matches_ts = {
    match pFinalizeDraft(COMPLETE_FIGHTER_DRAFT) {
      | Finalized(sheet) =>
          match pAdvanceLevel(sheet, LEVEL_UP_FIGHTER_NO_PATCH) {
            | Advanced(nextSheet) =>
                all {
                  assert(nextSheet.advancement.length() == ${fighterLevelTwo.sheet.advancement.length}),
                  assert(nextSheet.abilityScores.get(Str) == ${fighterLevelTwo.sheet.abilityScores.str}),
                  assert(nextSheet.abilityScores.get(Con) == ${fighterLevelTwo.sheet.abilityScores.con}),
                }
            | AdvanceBlocked(_) => assert(false)
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_advancement_wizard_missing_patch_blocks_like_ts = {
    match pFinalizeDraft(COMPLETE_WIZARD_DRAFT) {
      | Finalized(sheet) =>
          match pAdvanceLevel(sheet, LEVEL_UP_WIZARD_NO_PATCH) {
            | Advanced(_) => assert(false)
            | AdvanceBlocked(blocked) =>
                all {
                  assert(blocked.openChoices == ${renderIssueSet(wizardBlockedAssessment.openChoices.map((choice) => choice.code))}),
                  assert(blocked.illegalIssues == ${renderIssueSet(wizardBlockedAssessment.issues.map((issue) => issue.code))}),
                }
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_advancement_contradictory_sheet_blocks_like_ts = {
    match pFinalizeDraft(COMPLETE_FIGHTER_DRAFT) {
      | Finalized(sheet) =>
          match pAdvanceLevel(
            sheet.with("abilityScores", sheet.abilityScores.set(Str, 20)),
            LEVEL_UP_FIGHTER_NO_PATCH,
          ) {
            | Advanced(_) => assert(false)
            | AdvanceBlocked(blocked) =>
                all {
                  assert(blocked.openChoices == Set()),
                  assert(blocked.illegalIssues == ${renderIssueSet(
                    contradictoryAdvance.issues.map((issue) => issue.code),
                  )}),
                }
          }
      | Blocked(_) => assert(false)
    }
  }
}
`,
        "character-advancement-parity",
      );
    },
  );

  it(
    "keeps the character-to-creature projection boundary aligned with Quint",
    { timeout: 120_000 },
    async () => {
      const fighterLevelFiveDraft = completeFighterDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: { tag: "abilityScoreImprovement", abilities: ["str"] },
            },
          }),
          advancementEntry("fighter"),
        ],
      });
      const fighterLevelFive = finalizeCharacterDraft(fighterLevelFiveDraft);
      expect(fighterLevelFive.ok).toBe(true);
      if (!fighterLevelFive.ok) {
        throw new Error("expected fighter level-five sheet");
      }
      const fighterProjection = characterSheetCreatureProjection(
        fighterLevelFive.sheet,
      );

      const wizardLevelOneDraft = completeWizardDraft();
      const wizardLevelOne = finalizeCharacterDraft(wizardLevelOneDraft);
      expect(wizardLevelOne.ok).toBe(true);
      if (!wizardLevelOne.ok) {
        throw new Error("expected wizard level-one sheet");
      }
      const wizardProjection = characterSheetCreatureProjection(
        wizardLevelOne.sheet,
      );

      const rogueExpertiseDraft = completeFighterDraft({
        primaryClass: "rogue",
        advancement: [advancementEntry("rogue")],
        background: "criminal",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "int",
        },
        species: "elf",
        choices: {
          primaryClassSkills: [
            "acrobatics",
            "athletics",
            "investigation",
            "persuasion",
          ],
          speciesSkill: "perception",
          rogueLanguage: "Sylvan",
          expertiseSkills: ["stealth", "perception"],
        },
        equipment: {
          backgroundOption: "package",
          classOption: "packageA",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {
            wieldedWeapon: "shortsword",
          },
        },
      });
      const rogueExpertiseFinalization =
        finalizeCharacterDraft(rogueExpertiseDraft);
      expect(rogueExpertiseFinalization.ok).toBe(true);
      if (!rogueExpertiseFinalization.ok) {
        throw new Error("expected rogue expertise sheet");
      }
      const rogueExpertiseProjection = characterSheetCreatureProjection(
        rogueExpertiseFinalization.sheet,
      );

      const multiclassDraft = completeFighterDraft({
        primaryClass: "fighter",
        advancement: [advancementEntry("fighter"), advancementEntry("wizard")],
        background: "sage",
        abilityScoreGeneration: {
          mode: "standardArray",
          assignedScores: {
            str: 14,
            dex: 13,
            con: 12,
            int: 15,
            wis: 10,
            cha: 8,
          },
        },
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "con",
        },
        choices: {
          primaryClassSkills: ["acrobatics", "perception"],
          speciesSkill: "stealth",
          fighterFightingStyle: "defense",
          humanOriginFeat: {
            feat: "skilled",
            proficiencies: ["religion", "thievesTools", "viol"],
          },
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "detect_magic",
              "magic_missile",
              "shield",
            ],
            spellbook: [
              "burning_hands",
              "detect_magic",
              "magic_missile",
              "shield",
              "identify",
              "sleep",
            ],
          },
        },
        equipment: {
          backgroundOption: "package",
          classOption: "packageA",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {
            wieldedWeapon: "greatsword",
            wieldedWeaponGrip: "twoHanded",
          },
        },
      });
      const multiclassFinalization = finalizeCharacterDraft(multiclassDraft);
      expect(multiclassFinalization.ok).toBe(true);
      if (!multiclassFinalization.ok) {
        throw new Error("expected fighter-wizard multiclass sheet");
      }
      const multiclassProjection = characterSheetCreatureProjection(
        multiclassFinalization.sheet,
      );
      const fighterWithoutSubclassProjection = characterSheetCreatureProjection(
        {
          ...fighterLevelFive.sheet,
          advancement: [
            advancementEntry("fighter"),
            advancementEntry("fighter"),
            advancementEntry("fighter"),
          ],
          // Contradiction now comes from rewinding the owned advancement path.
        },
      );

      await runQuintParityModule(
        `module characterProjectionParity {
  import creature.* from "../creature"
  import characterCreation.* from "../character-creation"
  import character.* from "../character"

  pure val FIGHTER_LEVEL_FIVE_DRAFT: CharacterDraft = ${renderDraft(fighterLevelFiveDraft)}
  pure val COMPLETE_WIZARD_DRAFT: CharacterDraft = ${renderDraft(wizardLevelOneDraft)}
  pure val ROGUE_EXPERTISE_DRAFT: CharacterDraft = ${renderDraft(rogueExpertiseDraft)}
  pure val FIGHTER_WIZARD_MULTICLASS_DRAFT: CharacterDraft = ${renderDraft(multiclassDraft)}

  run parity_projection_fighter_level_five_matches_ts = {
    match pFinalizeDraft(FIGHTER_LEVEL_FIVE_DRAFT) {
      | Finalized(sheet) =>
          val projection = pCharacterCreatureProjection(sheet)
          all {
            ${renderProjectionAssertions(fighterProjection)}
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_projection_wizard_level_one_matches_ts = {
    match pFinalizeDraft(COMPLETE_WIZARD_DRAFT) {
      | Finalized(sheet) =>
          val projection = pCharacterCreatureProjection(sheet)
          all {
            ${renderProjectionAssertions(wizardProjection)}
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_projection_rogue_expertise_matches_ts = {
    match pFinalizeDraft(ROGUE_EXPERTISE_DRAFT) {
      | Finalized(sheet) =>
          val projection = pCharacterCreatureProjection(sheet)
          all {
            ${renderProjectionAssertions(rogueExpertiseProjection)}
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_projection_fighter_wizard_multiclass_matches_ts = {
    match pFinalizeDraft(FIGHTER_WIZARD_MULTICLASS_DRAFT) {
      | Finalized(sheet) =>
          val projection = pCharacterCreatureProjection(sheet)
          all {
            ${renderProjectionAssertions(multiclassProjection)}
          }
      | Blocked(_) => assert(false)
    }
  }

  run parity_projection_fighter_without_subclass_keeps_default_crit_range = {
    match pFinalizeDraft(FIGHTER_LEVEL_FIVE_DRAFT) {
      | Finalized(sheet) =>
          val levelThreeWithoutSubclass =
            sheet
              .with("advancement", [
                { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
                { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
                { className: Fighter, subclass: NoSubclassSelection, feat: NoAdvancementFeatSelection },
              ])
          val projection = pCharacterCreatureProjection(levelThreeWithoutSubclass)
          all {
            assert(projection.critRange == ${fighterWithoutSubclassProjection.critRange}),
            assert(projection.subclasses == []),
          }
      | Blocked(_) => assert(false)
    }
  }
}
`,
        "character-projection-parity",
      );
    },
  );
});
