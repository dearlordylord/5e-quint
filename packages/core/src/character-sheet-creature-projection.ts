import { characterSubclassSelections } from "#/character-advancement.ts";
import { type CharacterSheet } from "#/character-domain-model.ts";
import { characterProficiencySummary } from "#/character-domain-derived.ts";
import { SPELLCASTING_ABILITIES } from "#/character-spellcasting-data.ts";
import type { CharacterAdvancementEntry } from "#/character-feature-types.ts";
import { classHitDie } from "#/features/class-tables.ts";
import {
  championCritRange,
  type FightingStyle,
} from "#/features/class-fighter.ts";
import type { Skill } from "#/character-proficiencies.ts";
import {
  CASTER_CLASSES,
  type Ability,
  type ArmorCategory,
  type Size,
  type UnarmoredDefense,
} from "#/types.ts";
import { Match } from "effect";

const SPECIES_WALK_SPEED = {
  dragonborn: 30,
  dwarf: 30,
  elf: 30,
  gnome: 30,
  goliath: 35,
  halfling: 30,
  human: 30,
  orc: 30,
  tiefling: 30,
} as const satisfies Readonly<Record<CharacterSheet["species"], number>>;

const SPECIES_CREATURE_SIZE = {
  dragonborn: "medium",
  dwarf: "medium",
  elf: "medium",
  gnome: "small",
  goliath: "medium",
  halfling: "small",
  human: "medium",
  orc: "medium",
  tiefling: "medium",
} as const satisfies Readonly<Record<CharacterSheet["species"], Size>>;

const CHARACTER_CREATURE_FEATURES = [
  "extraAttack",
  "extraAttack2",
  "extraAttack3",
] as const;
type CharacterCreatureFeature = (typeof CHARACTER_CREATURE_FEATURES)[number];

export interface CharacterCreatureProjection {
  readonly primaryClass: CharacterSheet["primaryClass"];
  readonly subclasses: ReturnType<typeof characterSubclassSelections>;
  readonly species: CharacterSheet["species"];
  readonly classLevels: CharacterSheet["classLevels"];
  readonly fightingStyles: ReadonlySet<FightingStyle>;
  readonly creatureSize: Size;
  readonly abilityScores: CharacterSheet["abilityScores"];
  readonly baseWalkSpeed: number;
  readonly saveProficiencies: ReadonlySet<Ability>;
  readonly skillProficiencies: ReadonlySet<Skill>;
  readonly expertiseSkills: ReadonlySet<Skill>;
  readonly armorProficiencies: ReadonlySet<ArmorCategory>;
  readonly hitDieType: number;
  readonly spellcastingAbility: Ability;
  readonly hasSpellcasting: boolean;
  readonly unarmoredDefense: UnarmoredDefense;
  readonly features: ReadonlySet<CharacterCreatureFeature>;
  readonly critRange: number;
  readonly hasFightingStyleFeature: boolean;
}

export function speciesWalkSpeed(sheet: CharacterSheet): number {
  return SPECIES_WALK_SPEED[sheet.species];
}

function speciesCreatureSize(sheet: CharacterSheet): Size {
  return SPECIES_CREATURE_SIZE[sheet.species];
}

function selectedFightingStyles(
  _sheet: CharacterSheet,
): ReadonlySet<FightingStyle> {
  // The character-owned sheet does not yet persist Fighting Style feat choices.
  return new Set();
}

function armorProficiencies(sheet: CharacterSheet): ReadonlySet<ArmorCategory> {
  return new Set(
    characterProficiencySummary(sheet).armorTraining.filter(
      (training): training is ArmorCategory => training !== "shield",
    ),
  );
}

function firstCasterClass(
  advancement: ReadonlyArray<CharacterAdvancementEntry>,
): (typeof CASTER_CLASSES)[number] | undefined {
  return advancement.find(
    (
      entry,
    ): entry is CharacterAdvancementEntry & {
      readonly className: (typeof CASTER_CLASSES)[number];
    } =>
      CASTER_CLASSES.includes(
        entry.className as (typeof CASTER_CLASSES)[number],
      ),
  )?.className;
}

function spellcastingAbility(sheet: CharacterSheet): Ability {
  const casterClass = firstCasterClass(sheet.advancement);

  return Match.value(casterClass).pipe(
    Match.when(undefined, () => "wis" as const),
    Match.when("bard", () => SPELLCASTING_ABILITIES.bard),
    Match.when("cleric", () => SPELLCASTING_ABILITIES.cleric),
    Match.when("druid", () => SPELLCASTING_ABILITIES.druid),
    Match.when("paladin", () => SPELLCASTING_ABILITIES.paladin),
    Match.when("ranger", () => SPELLCASTING_ABILITIES.ranger),
    Match.when("sorcerer", () => SPELLCASTING_ABILITIES.sorcerer),
    Match.when("warlock", () => SPELLCASTING_ABILITIES.warlock),
    Match.when("wizard", () => SPELLCASTING_ABILITIES.wizard),
    Match.exhaustive,
  );
}

function hasSpellcasting(sheet: CharacterSheet): boolean {
  return CASTER_CLASSES.some((className) => sheet.classLevels[className] > 0);
}

function unarmoredDefense(sheet: CharacterSheet): UnarmoredDefense {
  if (sheet.classLevels.barbarian > 0) return "barbarian";
  if (sheet.classLevels.monk > 0) return "monk";
  return "none";
}

function creatureFeatures(
  classLevels: CharacterSheet["classLevels"],
): ReadonlySet<CharacterCreatureFeature> {
  const features = new Set<CharacterCreatureFeature>();

  if (classLevels.fighter >= 5) features.add("extraAttack");
  if (classLevels.fighter >= 11) features.add("extraAttack2");
  if (classLevels.fighter >= 20) features.add("extraAttack3");

  if (
    features.has("extraAttack") ||
    classLevels.barbarian >= 5 ||
    classLevels.monk >= 5 ||
    classLevels.paladin >= 5 ||
    classLevels.ranger >= 5
  ) {
    features.add("extraAttack");
  }

  return features;
}

function hasFightingStyleFeature(
  classLevels: CharacterSheet["classLevels"],
): boolean {
  return (
    classLevels.fighter >= 1 ||
    classLevels.paladin >= 2 ||
    classLevels.ranger >= 2
  );
}

export function characterSheetCreatureProjection(
  sheet: CharacterSheet,
): CharacterCreatureProjection {
  const proficiencySummary = characterProficiencySummary(sheet);
  const fighterSubclass = characterSubclassSelections(sheet).find(
    (selection) => selection.className === "fighter",
  );

  return {
    primaryClass: sheet.primaryClass,
    subclasses: proficiencySummary.subclasses,
    species: sheet.species,
    classLevels: sheet.classLevels,
    fightingStyles: selectedFightingStyles(sheet),
    creatureSize: speciesCreatureSize(sheet),
    abilityScores: sheet.abilityScores,
    baseWalkSpeed: speciesWalkSpeed(sheet),
    saveProficiencies: new Set(proficiencySummary.savingThrows),
    skillProficiencies: new Set(proficiencySummary.skills),
    expertiseSkills: new Set(),
    armorProficiencies: armorProficiencies(sheet),
    hitDieType: classHitDie(sheet.primaryClass),
    spellcastingAbility: spellcastingAbility(sheet),
    hasSpellcasting: hasSpellcasting(sheet),
    unarmoredDefense: unarmoredDefense(sheet),
    features: creatureFeatures(sheet.classLevels),
    critRange:
      fighterSubclass?.subclass === "champion"
        ? championCritRange(sheet.classLevels.fighter)
        : 20,
    hasFightingStyleFeature: hasFightingStyleFeature(sheet.classLevels),
  };
}
