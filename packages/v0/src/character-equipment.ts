import type { CharacterBackground } from "#/character-ability-scores.ts";
import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import type {
  CharacterArmorTraining,
  CharacterWeaponProficiency,
} from "#/character-feature-types.ts";
import {
  ARMOR_DATA,
  BACKGROUND_GOLD_OPTION_GP,
  BACKGROUND_PACKAGE_DATA,
  CHARACTER_ARMORS,
  CHARACTER_WEAPONS,
  CLASS_GOLD_OPTION_GP,
  CLASS_PACKAGE_DATA,
  SHIELD_ARMOR_TRAINING,
  SHIELD_COST_GP,
  WEAPON_DATA,
  type CharacterArmor,
  type CharacterBackgroundEquipmentOption,
  type CharacterClassEquipmentOption,
  type CharacterCombatEquipmentItem,
  type CharacterWeapon,
} from "#/character-equipment-data.ts";
import type { ClassName } from "#/features/class-tables.ts";
import type { BattleWeaponProfile } from "#/types.ts";

export {
  ARMOR_DATA,
  BACKGROUND_GOLD_OPTION_GP,
  BACKGROUND_PACKAGE_DATA,
  CHARACTER_ARMORS,
  CHARACTER_WEAPONS,
  CLASS_GOLD_OPTION_GP,
  CLASS_PACKAGE_DATA,
  SHIELD_ARMOR_TRAINING,
  SHIELD_COST_GP,
  WEAPON_DATA,
  type CharacterArmor,
  type CharacterBackgroundEquipmentOption,
  type CharacterClassEquipmentOption,
  type CharacterCombatEquipmentItem,
  type CharacterWeapon,
};

export const WEAPON_GRIPS = ["oneHanded", "twoHanded"] as const;
export type CharacterWeaponGrip = (typeof WEAPON_GRIPS)[number];

export interface CharacterLoadout {
  readonly wornArmor: CharacterArmor | null;
  readonly wieldedWeapon: CharacterWeapon | null;
  readonly secondaryWeapon: CharacterWeapon | null;
  readonly shield: boolean;
  readonly wieldedWeaponGrip: CharacterWeaponGrip | null;
}

export interface CharacterLoadoutDraft {
  readonly wornArmor?: CharacterArmor;
  readonly wieldedWeapon?: CharacterWeapon;
  readonly secondaryWeapon?: CharacterWeapon;
  readonly shield?: boolean;
  readonly wieldedWeaponGrip?: CharacterWeaponGrip;
}

export interface CharacterEquipmentChoicesDraft {
  readonly backgroundOption?: CharacterBackgroundEquipmentOption;
  readonly classOption?: CharacterClassEquipmentOption;
  readonly purchasedCombatEquipment?: ReadonlyArray<CharacterCombatEquipmentItem>;
  readonly remainingGoldPieces?: number;
  readonly loadout?: CharacterLoadoutDraft;
}

export interface CharacterEquipmentChoices {
  readonly backgroundOption: CharacterBackgroundEquipmentOption;
  readonly classOption: CharacterClassEquipmentOption;
  readonly purchasedCombatEquipment: ReadonlyArray<CharacterCombatEquipmentItem>;
  readonly remainingGoldPieces: number;
  readonly loadout: CharacterLoadout;
}

export interface CharacterOwnedCombatEquipment {
  readonly armor: ReadonlyArray<CharacterArmor>;
  readonly weapons: ReadonlyArray<CharacterWeapon>;
  readonly shields: number;
}

export interface CharacterEquipmentSheetLike {
  readonly primaryClass: ClassName;
  readonly background: CharacterBackground;
  readonly equipment: CharacterEquipmentChoices;
}

function countOccurrences<T extends string>(
  items: ReadonlyArray<T>,
  target: T,
): number {
  return items.filter((item) => item === target).length;
}

export function armorTrainingForArmor(
  armor: CharacterArmor,
): CharacterArmorTraining {
  return ARMOR_DATA[armor].category;
}

export function weaponProficiencyMatchesWeapon(
  proficiencies: ReadonlyArray<CharacterWeaponProficiency>,
  weapon: CharacterWeapon,
): boolean {
  const simpleWeapons = [
    "club",
    "dagger",
    "greatclub",
    "handaxe",
    "javelin",
    "lightHammer",
    "mace",
    "quarterstaff",
    "sickle",
    "spear",
    "dart",
    "lightCrossbow",
    "shortbow",
    "sling",
  ] as const satisfies ReadonlyArray<CharacterWeapon> as ReadonlyArray<string>;
  const isSimple = simpleWeapons.includes(weapon);
  const data = WEAPON_DATA[weapon];

  if (proficiencies.includes("simple") && isSimple) return true;
  if (proficiencies.includes("martial") && !isSimple) return true;
  if (
    proficiencies.includes("martialLight") &&
    !isSimple &&
    data.properties.includes("light")
  ) {
    return true;
  }
  return (
    proficiencies.includes("martialFinesseOrLight") &&
    !isSimple &&
    (data.properties.includes("finesse") || data.properties.includes("light"))
  );
}

export function ownedCombatEquipment(
  sheet: Pick<
    CharacterEquipmentSheetLike,
    "primaryClass" | "background" | "equipment"
  >,
): CharacterOwnedCombatEquipment {
  const items: CharacterCombatEquipmentItem[] = [];

  if (sheet.equipment.backgroundOption === "package") {
    items.push(...BACKGROUND_PACKAGE_DATA[sheet.background].items);
  }
  if (sheet.equipment.classOption !== "gold") {
    items.push(
      ...CLASS_PACKAGE_DATA[sheet.primaryClass][sheet.equipment.classOption]!
        .items,
    );
  }
  items.push(...sheet.equipment.purchasedCombatEquipment);

  return {
    armor: items.filter((item): item is CharacterArmor =>
      (CHARACTER_ARMORS as ReadonlyArray<string>).includes(item),
    ),
    weapons: items.filter((item): item is CharacterWeapon =>
      (CHARACTER_WEAPONS as ReadonlyArray<string>).includes(item),
    ),
    shields: countOccurrences(items, "shield"),
  };
}

export function startingGoldPieces(
  sheet: Pick<
    CharacterEquipmentSheetLike,
    "primaryClass" | "background" | "equipment"
  >,
): number {
  const backgroundGold =
    sheet.equipment.backgroundOption === "gold"
      ? BACKGROUND_GOLD_OPTION_GP[sheet.background]
      : BACKGROUND_PACKAGE_DATA[sheet.background].goldPieces;
  const classGold =
    sheet.equipment.classOption === "gold"
      ? CLASS_GOLD_OPTION_GP[sheet.primaryClass]
      : CLASS_PACKAGE_DATA[sheet.primaryClass][sheet.equipment.classOption]!
          .goldPieces;
  return backgroundGold + classGold;
}

export function projectBattleWeaponProfile(
  weapon: CharacterWeapon,
): BattleWeaponProfile {
  const data = WEAPON_DATA[weapon];
  return {
    name: data.displayName,
    damageType: data.damageType,
    isMelee: data.isMelee,
    properties: new Set(data.properties),
    ...(data.damageDie != null ? { damageDie: data.damageDie } : {}),
    ...(data.diceCount != null ? { diceCount: data.diceCount } : {}),
    ...(data.versatileDie != null ? { versatileDie: data.versatileDie } : {}),
  };
}

export function characterBattleEquipmentProjection(
  sheet: CharacterEquipmentSheetLike,
): Pick<
  InitCreatureConfig,
  | "hasShieldEquipped"
  | "isWearingArmor"
  | "mainHandUsesTwoHands"
  | "mainHandWeapon"
  | "offHandWeapon"
> {
  const { loadout } = sheet.equipment;
  const weapon = loadout.wieldedWeapon;
  const mainHandUsesTwoHands =
    weapon != null &&
    (WEAPON_DATA[weapon].properties.includes("twoHanded") ||
      loadout.wieldedWeaponGrip === "twoHanded");

  return {
    hasShieldEquipped: loadout.shield === true,
    isWearingArmor: loadout.wornArmor != null,
    mainHandUsesTwoHands,
    ...(weapon != null
      ? { mainHandWeapon: projectBattleWeaponProfile(weapon) }
      : {}),
    ...(loadout.secondaryWeapon != null
      ? {
          offHandWeapon: projectBattleWeaponProfile(loadout.secondaryWeapon),
        }
      : {}),
  };
}
