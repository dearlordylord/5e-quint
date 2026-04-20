import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import { preparedBattleSpellAccess } from "#/battle-spell-access.ts";
import { characterBattleEquipmentProjection } from "#/character-equipment.ts";
import {
  characterProficiencySummary,
  finalAbilityModifiers,
  sheetClassLevels,
  type CharacterSheet,
} from "#/character-domain.ts";
import {
  characterSheetCreatureProjection,
  speciesWalkSpeed,
} from "#/character-sheet-creature-projection.ts";
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
import { sneakAttackDice } from "#/features/class-rogue.ts";
import type { ActiveProjectedPersistent } from "#/projected-persistent.ts";
import type { DndMachineInput } from "#/machine-types.ts";
import {
  abilityModifier,
  armorClass,
  classLevel,
  type Ability,
} from "#/types.ts";

export {
  characterSheetCreatureProjection,
  type CharacterCreatureProjection,
} from "#/character-sheet-creature-projection.ts";

const SHIELD_ARMOR_CLASS_BONUS = 2;

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

function hitPointMaximum(
  sheet: CharacterSheet,
  abilityModifiers: AbilityModifierMap,
): number {
  let hp = 0;
  const classLevels = sheetClassLevels(sheet);

  const primaryClassLevels = classLevels[sheet.primaryClass];
  if (primaryClassLevels <= 0) return 0;

  hp += levelOneHitPoints(
    classHitDie(sheet.primaryClass),
    abilityModifiers.con,
  );
  hp +=
    Math.max(0, primaryClassLevels - 1) *
    levelUpHitPoints(sheet.primaryClass, abilityModifiers.con);

  for (const [className, level] of Object.entries(classLevels) as ReadonlyArray<
    readonly [ClassName, number]
  >) {
    if (className === sheet.primaryClass || level <= 0) continue;
    hp += level * levelUpHitPoints(className, abilityModifiers.con);
  }

  return hp;
}

function hitDiceRemaining(sheet: CharacterSheet): HitDiceRemaining {
  return { ...sheetClassLevels(sheet) };
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
  const classLevels = sheetClassLevels(sheet);
  if (classLevels.barbarian <= 0) return null;
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
  const classLevels = sheetClassLevels(sheet);
  if (classLevels.monk <= 0) return null;
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
  const classLevels = sheetClassLevels(sheet);

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
      classLevels,
      choices: sheet.choices,
      spellcasting: sheet.spellcasting,
      proficiencyBonus,
    }),
  };
}

export function characterSheetMachineInput(
  sheet: CharacterSheet,
): DndMachineInput {
  const projection = characterSheetCreatureProjection(sheet);
  const derived = deriveCharacterSheetNumbers(sheet);
  const abilityModifiers = finalAbilityModifiers(sheet);

  return {
    maxHp: derived.maxHp,
    conMod: abilityModifier(abilityModifiers.con),
    hitDiceRemaining: derived.hitDiceRemaining,
    baseWalkSpeed: projection.baseWalkSpeed,
    effectiveSpeed: projection.baseWalkSpeed,
    movementRemaining: projection.baseWalkSpeed,
    barbarianLevel:
      projection.classLevels.barbarian > 0
        ? classLevel(projection.classLevels.barbarian)
        : undefined,
    bardLevel:
      projection.classLevels.bard > 0
        ? classLevel(projection.classLevels.bard)
        : undefined,
    clericLevel:
      projection.classLevels.cleric > 0
        ? classLevel(projection.classLevels.cleric)
        : undefined,
    druidLevel:
      projection.classLevels.druid > 0
        ? classLevel(projection.classLevels.druid)
        : undefined,
    fighterLevel:
      projection.classLevels.fighter > 0
        ? classLevel(projection.classLevels.fighter)
        : undefined,
    monkLevel:
      projection.classLevels.monk > 0
        ? classLevel(projection.classLevels.monk)
        : undefined,
    paladinLevel:
      projection.classLevels.paladin > 0
        ? classLevel(projection.classLevels.paladin)
        : undefined,
    rangerLevel:
      projection.classLevels.ranger > 0
        ? classLevel(projection.classLevels.ranger)
        : undefined,
    rogueLevel:
      projection.classLevels.rogue > 0
        ? classLevel(projection.classLevels.rogue)
        : undefined,
    sorcererLevel:
      projection.classLevels.sorcerer > 0
        ? classLevel(projection.classLevels.sorcerer)
        : undefined,
    warlockLevel:
      projection.classLevels.warlock > 0
        ? classLevel(projection.classLevels.warlock)
        : undefined,
    wizardLevel:
      projection.classLevels.wizard > 0
        ? classLevel(projection.classLevels.wizard)
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
  | "activeProjectedPersistents"
  | "rogueLevel"
  | "monkLevel"
  | "fighterLevel"
  | "barbarianLevel"
  | "bardLevel"
  | "spellAccesses"
  | "preparedSpells"
  | "spellSaveDCs"
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
  runtime?: {
    readonly activeProjectedPersistents?: ReadonlySet<ActiveProjectedPersistent>;
  },
): CharacterBattleProjection {
  const projection = characterSheetCreatureProjection(sheet);
  const derived = deriveCharacterSheetNumbers(sheet);
  const abilityModifiers = finalAbilityModifiers(sheet);
  const battleEquipment = characterBattleEquipmentProjection(sheet);

  return {
    maxHp: derived.maxHp,
    baseArmorClass: armorClass(derived.armorClass),
    baseWalkSpeed: projection.baseWalkSpeed,
    caster: derived.spellcasting.preparedSpells.size > 0,
    strMod: abilityModifiers.str,
    dexMod: abilityModifiers.dex,
    rogueLevel: projection.classLevels.rogue,
    monkLevel: projection.classLevels.monk,
    fighterLevel: projection.classLevels.fighter,
    barbarianLevel: projection.classLevels.barbarian,
    bardLevel: projection.classLevels.bard,
    // Spell access facts: creature-owned prepared access paths derived from
    // sheet spellcasting state. Spell definitions stay in authored spell data.
    spellAccesses: [...derived.spellcasting.preparedSpells].map(
      (currentSpellId) =>
        preparedBattleSpellAccess({
          spellId: currentSpellId,
          spellSaveDC:
            derived.spellcasting.preparedSpellSaveDCs.get(currentSpellId)!,
        }),
    ),
    preparedSpells: derived.spellcasting.preparedSpells,
    spellSaveDCs: derived.spellcasting.preparedSpellSaveDCs,
    slotsMax: derived.spellcasting.slotsMax,
    slotsCurrent: derived.spellcasting.slotsCurrent,
    pactSlotsMax: derived.spellcasting.pactSlotsMax,
    pactSlotsCurrent: derived.spellcasting.pactSlotsCurrent,
    pactSlotLevel: derived.spellcasting.pactSlotLevel,
    critRange: projection.critRange,
    sneakAttackDice: sneakAttackDice(sheetClassLevels(sheet).rogue),
    ...(runtime?.activeProjectedPersistents != null
      ? { activeProjectedPersistents: runtime.activeProjectedPersistents }
      : {}),
    ...battleEquipment,
  };
}
