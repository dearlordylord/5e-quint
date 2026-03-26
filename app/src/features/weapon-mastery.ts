import { featureSaveDC } from "#/srd-constants.ts"

// --- Types ---

/** Weapon mastery properties per SRD 5.2.1 Equipment chapter. */
export type WeaponMasteryProperty = "cleave" | "graze" | "nick" | "push" | "sap" | "slow" | "topple" | "vex"

// --- Constants ---

const PUSH_DISTANCE_FEET = 10
const SLOW_SPEED_REDUCTION_FEET = 10

/** Maps standard SRD 5.2.1 weapons to their mastery property. */
export const WEAPON_MASTERY_MAP: Readonly<Record<string, WeaponMasteryProperty>> = {
  // Simple Melee
  club: "slow",
  dagger: "nick",
  greatclub: "push",
  handaxe: "vex",
  javelin: "slow",
  lightHammer: "nick",
  mace: "sap",
  quarterstaff: "topple",
  sickle: "nick",
  spear: "sap",
  // Simple Ranged
  dart: "vex",
  lightCrossbow: "slow",
  shortbow: "vex",
  sling: "slow",
  // Martial Melee
  battleaxe: "topple",
  flail: "sap",
  glaive: "graze",
  greataxe: "cleave",
  greatsword: "graze",
  halberd: "cleave",
  lance: "topple",
  longsword: "sap",
  maul: "topple",
  morningstar: "sap",
  pike: "push",
  rapier: "vex",
  scimitar: "nick",
  shortsword: "vex",
  trident: "topple",
  warhammer: "push",
  warPick: "sap",
  whip: "slow",
  // Martial Ranged
  blowgun: "vex",
  handCrossbow: "vex",
  heavyCrossbow: "push",
  longbow: "slow",
  musket: "slow",
  pistol: "vex"
}

// --- Shared precondition ---

/** Returns true if the character has Weapon Mastery and the weapon's mastery property matches. */
export function masteryActive(
  hasWeaponMastery: boolean,
  weaponMastery: WeaponMasteryProperty,
  required: WeaponMasteryProperty
): boolean {
  return hasWeaponMastery && weaponMastery === required
}

// --- Cleave ---

/**
 * Can use Cleave: on hit with a weapon that has the Cleave mastery.
 * SRD: "If you hit a creature with a melee attack roll using this weapon,
 * you can make a melee attack roll with the weapon against a second creature
 * within 5 feet of the first that is also within your reach."
 */
export function canCleave(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  hitTarget: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "cleave") && hitTarget
}

/**
 * Returns the weapon die size for the extra Cleave damage roll.
 * SRD: "the second creature takes the weapon's damage, but don't add your
 * ability modifier to that damage unless that modifier is negative."
 * Caller rolls the die and applies negative modifier if applicable.
 */
export function cleaveExtraDamage(weaponDieSize: number): number {
  return weaponDieSize
}

// --- Graze ---

/**
 * Can use Graze: on MISS with a weapon that has the Graze mastery.
 * SRD: "If your attack roll with this weapon misses a creature, you can deal
 * damage to that creature equal to the ability modifier you used to make the
 * attack roll."
 */
export function canGraze(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  missedTarget: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "graze") && missedTarget
}

/**
 * Returns the Graze damage: ability modifier used for the attack, minimum 1.
 * SRD doesn't explicitly state min 1, but damage cannot be negative;
 * ability modifier damage with no other increases floors at the modifier value.
 * We apply min 1 so the mastery always deals at least some damage.
 */
export function grazeDamage(abilityMod: number): number {
  return Math.max(1, abilityMod)
}

// --- Nick ---

/**
 * Can use Nick: when making the Extra Attack action with a Nick weapon.
 * SRD: "When you make the extra attack of the Light property, you can make it
 * as part of the Attack action instead of as a Bonus Action."
 */
export function canNick(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  hasExtraAttack: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "nick") && hasExtraAttack
}

// --- Push ---

/**
 * Can use Push: on hit with a weapon that has the Push mastery.
 * SRD: "If you hit a creature with this weapon, you can push the creature
 * up to 10 feet straight away from yourself if it is Large or smaller."
 */
export function canPush(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  hitTarget: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "push") && hitTarget
}

/** Returns the Push distance in feet (always 10). */
export function pushDistance(): 10 {
  return PUSH_DISTANCE_FEET as 10
}

// --- Sap ---

/**
 * Can use Sap: on hit with a weapon that has the Sap mastery.
 * SRD: "If you hit a creature with this weapon, that creature has Disadvantage
 * on its next attack roll before the start of your next turn."
 */
export function canSap(hasWeaponMastery: boolean, masteryProperty: WeaponMasteryProperty, hitTarget: boolean): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "sap") && hitTarget
}

/** Returns the Sap effect: target has Disadvantage on next attack roll. */
export function sapResult(): { readonly targetDisadvantageOnNextAttack: true } {
  return { targetDisadvantageOnNextAttack: true }
}

// --- Slow ---

/**
 * Can use Slow: on hit with a weapon that has the Slow mastery.
 * SRD: "If you hit a creature with this weapon and deal damage to it,
 * you can reduce its Speed by 10 feet until the start of your next turn."
 */
export function canSlow(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  hitTarget: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "slow") && hitTarget
}

/** Returns the Slow speed reduction in feet (always 10). */
export function slowSpeedReduction(): 10 {
  return SLOW_SPEED_REDUCTION_FEET as 10
}

// --- Topple ---

/**
 * Can use Topple: on hit with a weapon that has the Topple mastery.
 * SRD: "If you hit a creature with this weapon, you can force the creature
 * to make a Constitution saving throw (DC 8 plus the ability modifier used
 * to make the attack roll and your Proficiency Bonus)."
 */
export function canTopple(
  hasWeaponMastery: boolean,
  masteryProperty: WeaponMasteryProperty,
  hitTarget: boolean
): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "topple") && hitTarget
}

/** Returns the Topple saving throw DC: 8 + ability modifier + proficiency bonus. */
export const toppleDC: (abilityMod: number, profBonus: number) => number = featureSaveDC

/** Returns the Topple result: target falls Prone on failed save. */
export function toppleResult(savePassed: boolean): { readonly targetProne: boolean } {
  return { targetProne: !savePassed }
}

// --- Vex ---

/**
 * Can use Vex: on hit with a weapon that has the Vex mastery.
 * SRD: "If you hit a creature with this weapon and deal damage to the creature,
 * you have Advantage on your next attack roll against that creature before the
 * end of your next turn."
 */
export function canVex(hasWeaponMastery: boolean, masteryProperty: WeaponMasteryProperty, hitTarget: boolean): boolean {
  return masteryActive(hasWeaponMastery, masteryProperty, "vex") && hitTarget
}

/** Returns the Vex effect: Advantage on next attack roll vs that target. */
export function vexResult(): { readonly advantageOnNextAttackVsTarget: true } {
  return { advantageOnNextAttackVsTarget: true }
}
