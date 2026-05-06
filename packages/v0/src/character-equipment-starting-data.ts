import type { CharacterBackground } from "#/character-ability-scores.ts";
import type { ClassName } from "#/features/class-tables.ts";

import type { CharacterCombatEquipmentItem } from "#/character-equipment-gear-data.ts";

export const CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS = [
  "package",
  "gold",
] as const;
export type CharacterBackgroundEquipmentOption =
  (typeof CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS)[number];

export const CHARACTER_CLASS_EQUIPMENT_OPTIONS = [
  "packageA",
  "packageB",
  "gold",
] as const;
export type CharacterClassEquipmentOption =
  (typeof CHARACTER_CLASS_EQUIPMENT_OPTIONS)[number];

export interface CharacterEquipmentPackage {
  readonly items: ReadonlyArray<CharacterCombatEquipmentItem>;
  readonly goldPieces: number;
}

export const BACKGROUND_PACKAGE_DATA: Readonly<
  Record<CharacterBackground, CharacterEquipmentPackage>
> = {
  acolyte: { items: [], goldPieces: 8 },
  criminal: { items: ["dagger", "dagger"], goldPieces: 16 },
  sage: { items: ["quarterstaff"], goldPieces: 8 },
  soldier: { items: ["spear", "shortbow"], goldPieces: 14 },
};

export const BACKGROUND_GOLD_OPTION_GP: Readonly<
  Record<CharacterBackground, number>
> = {
  acolyte: 50,
  criminal: 50,
  sage: 50,
  soldier: 50,
};

export const CLASS_PACKAGE_DATA: Readonly<
  Record<
    ClassName,
    Readonly<
      Partial<
        Record<
          Exclude<CharacterClassEquipmentOption, "gold">,
          CharacterEquipmentPackage
        >
      >
    >
  >
> = {
  barbarian: {
    packageA: {
      items: ["greataxe", "handaxe", "handaxe", "handaxe", "handaxe"],
      goldPieces: 15,
    },
  },
  bard: {
    packageA: { items: ["leatherArmor", "dagger", "dagger"], goldPieces: 19 },
  },
  cleric: {
    packageA: { items: ["chainShirt", "shield", "mace"], goldPieces: 7 },
  },
  druid: {
    packageA: {
      items: ["leatherArmor", "shield", "sickle", "quarterstaff"],
      goldPieces: 9,
    },
  },
  fighter: {
    packageA: {
      items: [
        "chainMail",
        "greatsword",
        "flail",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
      ],
      goldPieces: 4,
    },
    packageB: {
      items: ["studdedLeatherArmor", "scimitar", "shortsword", "longbow"],
      goldPieces: 11,
    },
  },
  monk: {
    packageA: {
      items: ["spear", "dagger", "dagger", "dagger", "dagger", "dagger"],
      goldPieces: 11,
    },
  },
  paladin: {
    packageA: {
      items: [
        "chainMail",
        "shield",
        "longsword",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
      ],
      goldPieces: 9,
    },
  },
  ranger: {
    packageA: {
      items: ["studdedLeatherArmor", "scimitar", "shortsword", "longbow"],
      goldPieces: 7,
    },
  },
  rogue: {
    packageA: {
      items: ["leatherArmor", "dagger", "dagger", "shortsword", "shortbow"],
      goldPieces: 8,
    },
  },
  sorcerer: {
    packageA: { items: ["spear", "dagger", "dagger"], goldPieces: 28 },
  },
  warlock: {
    packageA: {
      items: ["leatherArmor", "sickle", "dagger", "dagger"],
      goldPieces: 15,
    },
  },
  wizard: {
    packageA: { items: ["dagger", "dagger", "quarterstaff"], goldPieces: 5 },
  },
};

export const CLASS_GOLD_OPTION_GP: Readonly<Record<ClassName, number>> = {
  barbarian: 75,
  bard: 90,
  cleric: 110,
  druid: 50,
  fighter: 155,
  monk: 50,
  paladin: 150,
  ranger: 150,
  rogue: 100,
  sorcerer: 50,
  warlock: 100,
  wizard: 55,
};
