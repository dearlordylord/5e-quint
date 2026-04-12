import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import { characterBattleEquipmentProjection } from "#/character-equipment.ts";
import {
  characterSubclassSelections,
  characterProficiencySummary,
  finalAbilityModifiers,
  type CharacterSheet,
} from "#/character-domain.ts";
import {
  SKILLS,
  SKILL_ABILITIES,
  type Skill,
} from "#/character-proficiencies.ts";
import { deriveProficiencyBonus } from "#/character-resources.ts";
import { deriveCharacterSpellcastingSummary } from "#/character-spellcasting.ts";
import {
  ARMOR_DATA,
  SHIELD_ARMOR_TRAINING,
} from "#/character-equipment-armor-data.ts";
import {
  classHitDie,
  type ClassName,
  type HitDiceRemaining,
} from "#/features/class-tables.ts";
import { championCritRange } from "#/features/class-fighter.ts";
import { sneakAttackDice } from "#/features/class-rogue.ts";
import { battleReadyableSpellPayloadsFromPreparedSpells } from "#/features/spell-available-actions.ts";
import type { DndMachineInput } from "#/machine-types.ts";
import {
  abilityModifier,
  armorClass,
  classLevel,
  type Ability,
} from "#/types.ts";

const SHIELD_ARMOR_CLASS_BONUS = 2;

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

type AbilityModifierMap = ReturnType<typeof finalAbilityModifiers>;

export interface CharacterSheetDerivedNumbers {
  readonly proficiencyBonus: number;
  readonly maxHp: number;
  readonly hitDiceRemaining: HitDiceRemaining;
  readonly armorClass: number;
  readonly baseWalkSpeed: number;
  readonly initiativeModifier: number;
  readonly initiativeScore: number;
  readonly savingThrowModifiers: Readonly<Record<Ability, number>>;
  readonly skillModifiers: Readonly<Record<Skill, number>>;
  readonly passivePerception: number;
  readonly spellcasting: ReturnType<typeof deriveCharacterSpellcastingSummary>;
}

function fixedHitPointsPerLevel(className: ClassName): number {
  return Math.floor(classHitDie(className) / 2) + 1;
}

function levelOneHitPoints(hitDie: number, conMod: number): number {
  return Math.max(1, hitDie + conMod);
}

function levelUpHitPoints(className: ClassName, conMod: number): number {
  return Math.max(1, fixedHitPointsPerLevel(className) + conMod);
}

function speciesWalkSpeed(sheet: CharacterSheet): number {
  return SPECIES_WALK_SPEED[sheet.species];
}

function hitPointMaximum(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number {
  let hp = 0;

  const primaryClassLevels = sheet.classLevels[sheet.primaryClass];
  if (primaryClassLevels <= 0) return 0;

  hp += levelOneHitPoints(
    classHitDie(sheet.primaryClass),
    abilityModifiers.con,
  );
  hp +=
    Math.max(0, primaryClassLevels - 1) *
    levelUpHitPoints(sheet.primaryClass, abilityModifiers.con);

  for (const [className, level] of Object.entries(
    sheet.classLevels,
  ) as ReadonlyArray<readonly [ClassName, number]>) {
    if (className === sheet.primaryClass || level <= 0) continue;
    hp += level * levelUpHitPoints(className, abilityModifiers.con);
  }

  return hp;
}

function hitDiceRemaining(sheet: CharacterSheet): HitDiceRemaining {
  return { ...sheet.classLevels };
}

function shieldArmorClassBonus(sheet: CharacterSheet): number {
  const proficiencies = characterProficiencySummary(sheet);
  return sheet.equipment.loadout.shield === true &&
    proficiencies.armorTraining.includes(SHIELD_ARMOR_TRAINING)
    ? SHIELD_ARMOR_CLASS_BONUS
    : 0;
}

function armorCalculation(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number | null {
  const wornArmor = sheet.equipment.loadout.wornArmor;
  if (wornArmor == null) return null;
  const armor = ARMOR_DATA[wornArmor];
  const dexterityBonus =
    armor.dexterityModifierCap == null
      ? abilityModifiers.dex
      : Math.min(abilityModifiers.dex, armor.dexterityModifierCap);
  return armor.baseArmorClass + dexterityBonus + shieldArmorClassBonus(sheet);
}

function baseUnarmoredArmorClass(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number {
  return 10 + abilityModifiers.dex + shieldArmorClassBonus(sheet);
}

function barbarianArmorClass(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number | null {
  if (sheet.classLevels.barbarian <= 0) return null;
  if (sheet.equipment.loadout.wornArmor != null) return null;
  return (
    10 +
    abilityModifiers.dex +
    abilityModifiers.con +
    shieldArmorClassBonus(sheet)
  );
}

function monkArmorClass(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number | null {
  if (sheet.classLevels.monk <= 0) return null;
  if (sheet.equipment.loadout.wornArmor != null) return null;
  if (sheet.equipment.loadout.shield === true) return null;
  return 10 + abilityModifiers.dex + abilityModifiers.wis;
}

function armorClassValue(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number {
  return Math.max(
    armorCalculation(sheet, abilityModifiers) ?? Number.NEGATIVE_INFINITY,
    baseUnarmoredArmorClass(sheet, abilityModifiers),
    barbarianArmorClass(sheet, abilityModifiers) ?? Number.NEGATIVE_INFINITY,
    monkArmorClass(sheet, abilityModifiers) ?? Number.NEGATIVE_INFINITY,
  );
}

function savingThrowModifiers(
  sheet: CharacterSheet,
): Readonly<Record<Ability, number>> {
  const proficiencies = characterProficiencySummary(sheet);
  const abilityModifiers = finalAbilityModifiers(sheet);
  const proficiencyBonus = deriveProficiencyBonus(sheet);

  return {
    str:
      abilityModifiers.str +
      (proficiencies.savingThrows.includes("str") ? proficiencyBonus : 0),
    dex:
      abilityModifiers.dex +
      (proficiencies.savingThrows.includes("dex") ? proficiencyBonus : 0),
    con:
      abilityModifiers.con +
      (proficiencies.savingThrows.includes("con") ? proficiencyBonus : 0),
    int:
      abilityModifiers.int +
      (proficiencies.savingThrows.includes("int") ? proficiencyBonus : 0),
    wis:
      abilityModifiers.wis +
      (proficiencies.savingThrows.includes("wis") ? proficiencyBonus : 0),
    cha:
      abilityModifiers.cha +
      (proficiencies.savingThrows.includes("cha") ? proficiencyBonus : 0),
  };
}

function skillModifiers(
  sheet: CharacterSheet,
): Readonly<Record<Skill, number>> {
  const proficiencies = characterProficiencySummary(sheet);
  const abilityModifiers = finalAbilityModifiers(sheet);
  const proficiencyBonus = deriveProficiencyBonus(sheet);

  return Object.fromEntries(
    SKILLS.map((skill) => [
      skill,
      abilityModifiers[SKILL_ABILITIES[skill]] +
        (proficiencies.skills.includes(skill) ? proficiencyBonus : 0),
    ]),
  ) as Readonly<Record<Skill, number>>;
}

export function deriveCharacterSheetNumbers(
  sheet: CharacterSheet,
): CharacterSheetDerivedNumbers {
  const abilityModifiers = finalAbilityModifiers(sheet);
  const proficiencyBonus = deriveProficiencyBonus(sheet);
  const derivedSkillModifiers = skillModifiers(sheet);

  return {
    proficiencyBonus,
    maxHp: hitPointMaximum(sheet, abilityModifiers),
    hitDiceRemaining: hitDiceRemaining(sheet),
    armorClass: armorClassValue(sheet, abilityModifiers),
    baseWalkSpeed: speciesWalkSpeed(sheet),
    initiativeModifier: abilityModifiers.dex,
    initiativeScore: 10 + abilityModifiers.dex,
    savingThrowModifiers: savingThrowModifiers(sheet),
    skillModifiers: derivedSkillModifiers,
    passivePerception: 10 + derivedSkillModifiers.perception,
    spellcasting: deriveCharacterSpellcastingSummary({
      abilityScores: sheet.abilityScores,
      classLevels: sheet.classLevels,
      choices: sheet.choices,
      spellcasting: sheet.spellcasting ?? {},
      proficiencyBonus,
    }),
  };
}

export function characterSheetMachineInput(
  sheet: CharacterSheet,
): DndMachineInput {
  const abilityModifiers = finalAbilityModifiers(sheet);
  const derived = deriveCharacterSheetNumbers(sheet);

  return {
    maxHp: derived.maxHp,
    conMod: abilityModifier(abilityModifiers.con),
    hitDiceRemaining: derived.hitDiceRemaining,
    baseWalkSpeed: derived.baseWalkSpeed,
    effectiveSpeed: derived.baseWalkSpeed,
    movementRemaining: derived.baseWalkSpeed,
    barbarianLevel:
      sheet.classLevels.barbarian > 0
        ? classLevel(sheet.classLevels.barbarian)
        : undefined,
    bardLevel:
      sheet.classLevels.bard > 0
        ? classLevel(sheet.classLevels.bard)
        : undefined,
    clericLevel:
      sheet.classLevels.cleric > 0
        ? classLevel(sheet.classLevels.cleric)
        : undefined,
    druidLevel:
      sheet.classLevels.druid > 0
        ? classLevel(sheet.classLevels.druid)
        : undefined,
    fighterLevel:
      sheet.classLevels.fighter > 0
        ? classLevel(sheet.classLevels.fighter)
        : undefined,
    monkLevel:
      sheet.classLevels.monk > 0
        ? classLevel(sheet.classLevels.monk)
        : undefined,
    paladinLevel:
      sheet.classLevels.paladin > 0
        ? classLevel(sheet.classLevels.paladin)
        : undefined,
    rangerLevel:
      sheet.classLevels.ranger > 0
        ? classLevel(sheet.classLevels.ranger)
        : undefined,
    rogueLevel:
      sheet.classLevels.rogue > 0
        ? classLevel(sheet.classLevels.rogue)
        : undefined,
    sorcererLevel:
      sheet.classLevels.sorcerer > 0
        ? classLevel(sheet.classLevels.sorcerer)
        : undefined,
    warlockLevel:
      sheet.classLevels.warlock > 0
        ? classLevel(sheet.classLevels.warlock)
        : undefined,
    wizardLevel:
      sheet.classLevels.wizard > 0
        ? classLevel(sheet.classLevels.wizard)
        : undefined,
    wisMod: abilityModifier(abilityModifiers.wis),
    chaMod: abilityModifier(abilityModifiers.cha),
    slotsMax: derived.spellcasting.slotsMax,
    slotsCurrent: derived.spellcasting.slotsCurrent,
    preparedSpells: derived.spellcasting.preparedSpells,
    wearingArmorWithoutTraining: false,
  };
}

type CharacterBattleProjection = Pick<
  InitCreatureConfig,
  | "maxHp"
  | "baseArmorClass"
  | "baseWalkSpeed"
  | "caster"
  | "strMod"
  | "dexMod"
  | "rogueLevel"
  | "monkLevel"
  | "fighterLevel"
  | "barbarianLevel"
  | "bardLevel"
  | "preparedSpells"
  | "readyableSpellPayloads"
  | "slotsMax"
  | "slotsCurrent"
  | "pactSlotsMax"
  | "pactSlotsCurrent"
  | "pactSlotLevel"
  | "critRange"
  | "sneakAttackDice"
> &
  ReturnType<typeof characterBattleEquipmentProjection>;

export function characterSheetBattleProjection(
  sheet: CharacterSheet,
): CharacterBattleProjection {
  const abilityModifiers = finalAbilityModifiers(sheet);
  const derived = deriveCharacterSheetNumbers(sheet);
  const fighterSubclass = characterSubclassSelections(sheet).find(
    (selection) => selection.className === "fighter",
  );

  return {
    maxHp: derived.maxHp,
    baseArmorClass: armorClass(derived.armorClass),
    baseWalkSpeed: derived.baseWalkSpeed,
    caster: derived.spellcasting.preparedSpells.size > 0,
    strMod: abilityModifiers.str,
    dexMod: abilityModifiers.dex,
    rogueLevel: sheet.classLevels.rogue,
    monkLevel: sheet.classLevels.monk,
    fighterLevel: sheet.classLevels.fighter,
    barbarianLevel: sheet.classLevels.barbarian,
    bardLevel: sheet.classLevels.bard,
    preparedSpells: derived.spellcasting.preparedSpells,
    readyableSpellPayloads: battleReadyableSpellPayloadsFromPreparedSpells(
      derived.spellcasting.preparedSpells,
      derived.spellcasting.slotsCurrent,
      derived.spellcasting.preparedSpellSaveDCs,
    ),
    slotsMax: derived.spellcasting.slotsMax,
    slotsCurrent: derived.spellcasting.slotsCurrent,
    pactSlotsMax: derived.spellcasting.pactSlotsMax,
    pactSlotsCurrent: derived.spellcasting.pactSlotsCurrent,
    pactSlotLevel: derived.spellcasting.pactSlotLevel,
    critRange:
      fighterSubclass?.subclass === "champion"
        ? championCritRange(sheet.classLevels.fighter)
        : 20,
    sneakAttackDice: sneakAttackDice(sheet.classLevels.rogue),
    ...characterBattleEquipmentProjection(sheet),
  };
}
