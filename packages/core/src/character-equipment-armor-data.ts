import type { ArmorCategory } from "#/types.ts";

/* eslint-disable no-magic-numbers -- SRD equipment tables are literal rules data */

export const CHARACTER_ARMORS = [
  "paddedArmor",
  "leatherArmor",
  "studdedLeatherArmor",
  "hideArmor",
  "chainShirt",
  "scaleMail",
  "breastplate",
  "halfPlateArmor",
  "ringMail",
  "chainMail",
  "splintArmor",
  "plateArmor",
] as const;
export type CharacterArmor = (typeof CHARACTER_ARMORS)[number];

export interface CharacterArmorData {
  readonly displayName: string;
  readonly category: ArmorCategory;
  readonly costGp: number;
  readonly baseArmorClass: number;
  readonly dexterityModifierCap: number | null;
  readonly strengthRequirement: number | null;
  readonly stealthDisadvantage: boolean;
}

export const SHIELD_COST_GP = 10;
export const SHIELD_ARMOR_TRAINING = "shield" as const;

export const ARMOR_DATA: Readonly<Record<CharacterArmor, CharacterArmorData>> =
  {
    paddedArmor: {
      displayName: "Padded Armor",
      category: "light",
      costGp: 5,
      baseArmorClass: 11,
      dexterityModifierCap: null,
      strengthRequirement: null,
      stealthDisadvantage: true,
    },
    leatherArmor: {
      displayName: "Leather Armor",
      category: "light",
      costGp: 10,
      baseArmorClass: 11,
      dexterityModifierCap: null,
      strengthRequirement: null,
      stealthDisadvantage: false,
    },
    studdedLeatherArmor: {
      displayName: "Studded Leather Armor",
      category: "light",
      costGp: 45,
      baseArmorClass: 12,
      dexterityModifierCap: null,
      strengthRequirement: null,
      stealthDisadvantage: false,
    },
    hideArmor: {
      displayName: "Hide Armor",
      category: "medium",
      costGp: 10,
      baseArmorClass: 12,
      dexterityModifierCap: 2,
      strengthRequirement: null,
      stealthDisadvantage: false,
    },
    chainShirt: {
      displayName: "Chain Shirt",
      category: "medium",
      costGp: 50,
      baseArmorClass: 13,
      dexterityModifierCap: 2,
      strengthRequirement: null,
      stealthDisadvantage: false,
    },
    scaleMail: {
      displayName: "Scale Mail",
      category: "medium",
      costGp: 50,
      baseArmorClass: 14,
      dexterityModifierCap: 2,
      strengthRequirement: null,
      stealthDisadvantage: true,
    },
    breastplate: {
      displayName: "Breastplate",
      category: "medium",
      costGp: 400,
      baseArmorClass: 14,
      dexterityModifierCap: 2,
      strengthRequirement: null,
      stealthDisadvantage: false,
    },
    halfPlateArmor: {
      displayName: "Half Plate Armor",
      category: "medium",
      costGp: 750,
      baseArmorClass: 15,
      dexterityModifierCap: 2,
      strengthRequirement: null,
      stealthDisadvantage: true,
    },
    ringMail: {
      displayName: "Ring Mail",
      category: "heavy",
      costGp: 30,
      baseArmorClass: 14,
      dexterityModifierCap: 0,
      strengthRequirement: null,
      stealthDisadvantage: true,
    },
    chainMail: {
      displayName: "Chain Mail",
      category: "heavy",
      costGp: 75,
      baseArmorClass: 16,
      dexterityModifierCap: 0,
      strengthRequirement: 13,
      stealthDisadvantage: true,
    },
    splintArmor: {
      displayName: "Splint Armor",
      category: "heavy",
      costGp: 200,
      baseArmorClass: 17,
      dexterityModifierCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: true,
    },
    plateArmor: {
      displayName: "Plate Armor",
      category: "heavy",
      costGp: 1500,
      baseArmorClass: 18,
      dexterityModifierCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: false,
    },
  };
