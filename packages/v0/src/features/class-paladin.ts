// Paladin class features: Lay on Hands, Paladin's Smite, Radiant Strikes
// SRD 5.2.1 Paladin

import type { Condition } from "#/types.ts";

// --- Lay on Hands (Level 1) ---

export function layOnHandsPoolMax(paladinLevel: number): number {
  if (paladinLevel <= 0) return 0;
  return paladinLevel * 5;
}

export interface LayOnHandsState {
  readonly hp: number;
  readonly maxHp: number;
  readonly layOnHandsPool: number;
  readonly conditions: ReadonlyArray<Condition>;
}

export interface LayOnHandsHealResult {
  readonly hp: number;
  readonly layOnHandsPool: number;
  readonly healedAmount: number;
}

/**
 * Lay on Hands: heal a creature by drawing from the pool.
 * As a Bonus Action, restore up to `amount` HP (capped by pool and missing HP).
 */
export function pLayOnHands(
  state: LayOnHandsState,
  amount: number,
): LayOnHandsHealResult {
  const clamped = Math.max(0, Math.min(amount, state.layOnHandsPool));
  const missingHp = state.maxHp - state.hp;
  const healedAmount = Math.min(clamped, missingHp);
  return {
    hp: state.hp + healedAmount,
    layOnHandsPool: state.layOnHandsPool - healedAmount,
    healedAmount,
  };
}

export function canLayOnHandsHeal(state: LayOnHandsState): boolean {
  return state.layOnHandsPool > 0 && state.hp < state.maxHp;
}

export interface LayOnHandsCureResult {
  readonly layOnHandsPool: number;
  readonly conditionRemoved: Condition;
}

const CURE_COST = 5;

/**
 * Spend 5 HP from pool to remove a condition. At L14+ (Restoring Touch) the
 * set of removable conditions expands — see curableConditions().
 */
export function pLayOnHandsCure(
  state: LayOnHandsState,
  condition: Condition,
): LayOnHandsCureResult {
  return {
    layOnHandsPool: state.layOnHandsPool - CURE_COST,
    conditionRemoved: condition,
  };
}

const POISONED_CONDITIONS = [
  "poisoned",
] as const satisfies ReadonlyArray<Condition>;
const RESTORING_TOUCH_CONDITIONS = [
  "poisoned",
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "paralyzed",
  "stunned",
] as const satisfies ReadonlyArray<Condition>;

const RESTORING_TOUCH_LEVEL = 14;

export function curableConditions(
  paladinLevel: number,
): ReadonlyArray<Condition> {
  if (paladinLevel >= RESTORING_TOUCH_LEVEL) return RESTORING_TOUCH_CONDITIONS;
  return POISONED_CONDITIONS;
}

export function canLayOnHandsCure(
  state: LayOnHandsState,
  condition: Condition,
  paladinLevel: number,
): boolean {
  return (
    state.layOnHandsPool >= CURE_COST &&
    curableConditions(paladinLevel).includes(condition) &&
    state.conditions.includes(condition)
  );
}

export const layOnHandsLongRest: (paladinLevel: number) => number =
  layOnHandsPoolMax;

// --- Paladin's Smite (Level 2) + Divine Smite spell ---

/**
 * Calculate Divine Smite damage dice (d8s).
 * Base: 2d8 at spell slot level 1, +1d8 per slot level above 1.
 * +1d8 extra vs Fiend or Undead.
 * SRD 5.2.1: no cap on smite dice.
 */
export function pDivineSmiteDamage(
  slotLevel: number,
  isUndeadOrFiend: boolean,
): number {
  const baseDice = 2;
  const fromSlot = baseDice + (slotLevel - 1);
  return isUndeadOrFiend ? fromSlot + 1 : fromSlot;
}

export interface PaladinSmiteState {
  readonly paladinSmiteFreeUseAvailable: boolean;
}

export interface PaladinSmiteFreeResult {
  readonly paladinSmiteFreeUseAvailable: false;
}

export function pPaladinSmiteFree(
  _state: PaladinSmiteState,
): PaladinSmiteFreeResult {
  return { paladinSmiteFreeUseAvailable: false };
}

export function canPaladinSmiteFree(state: PaladinSmiteState): boolean {
  return state.paladinSmiteFreeUseAvailable;
}

export function paladinSmiteLongRest(): PaladinSmiteState {
  return { paladinSmiteFreeUseAvailable: true };
}

// --- Radiant Strikes (Level 11) ---

const RADIANT_STRIKES_LEVEL = 11;
const RADIANT_STRIKES_DICE = 1;

export interface RadiantStrikesConfig {
  readonly paladinLevel: number;
  readonly isMeleeOrUnarmed: boolean;
}

/**
 * Radiant Strikes (Level 11): +1d8 Radiant on every melee weapon or unarmed strike hit.
 * Returns the number of bonus d8 dice (0 or 1).
 */
export function pRadiantStrikes(config: RadiantStrikesConfig): number {
  if (config.paladinLevel >= RADIANT_STRIKES_LEVEL && config.isMeleeOrUnarmed) {
    return RADIANT_STRIKES_DICE;
  }
  return 0;
}

// --- Faithful Steed (Level 5) ---

export const FAITHFUL_STEED_LEVEL = 5;

export function canUseFaithfulSteed(
  paladinLevel: number,
  faithfulSteedUsed: boolean,
): boolean {
  return paladinLevel >= FAITHFUL_STEED_LEVEL && !faithfulSteedUsed;
}

export function useFaithfulSteed(): { readonly faithfulSteedUsed: true } {
  return { faithfulSteedUsed: true };
}

// --- Aura of Protection (Level 6) ---

export const AURA_OF_PROTECTION_LEVEL = 6;
export const AURA_EXPANSION_LEVEL = 18;

export function auraOfProtectionBonus(
  paladinLevel: number,
  chaMod: number,
): number {
  if (paladinLevel < AURA_OF_PROTECTION_LEVEL) return 0;
  return Math.max(1, chaMod);
}

export function auraOfProtectionRange(paladinLevel: number): number {
  if (paladinLevel < AURA_OF_PROTECTION_LEVEL) return 0;
  if (paladinLevel >= AURA_EXPANSION_LEVEL) return 30;
  return 10;
}

export function canUseAuraOfProtection(
  paladinLevel: number,
  isConscious: boolean,
): boolean {
  return paladinLevel >= AURA_OF_PROTECTION_LEVEL && isConscious;
}

// --- Abjure Foes (Level 9) ---

export const ABJURE_FOES_LEVEL = 9;
export const ABJURE_FOES_RANGE_FEET = 60;

export interface AbjureFoesResult {
  readonly frightened: boolean;
  /** SRD: "can do only one of the following: move, take an action, or take a Bonus Action." */
  readonly restrictedActions: boolean;
}

export function canAbjureFoes(
  paladinLevel: number,
  channelDivinityCharges: number,
  actionsRemaining: number,
): boolean {
  return (
    paladinLevel >= ABJURE_FOES_LEVEL &&
    channelDivinityCharges > 0 &&
    actionsRemaining > 0
  );
}

export function abjureFoesResult(targetSavePassed: boolean): AbjureFoesResult {
  return {
    frightened: !targetSavePassed,
    restrictedActions: !targetSavePassed,
  };
}

// --- Channel Divinity Framework (SRD 5.2.1) ---

/* eslint-disable no-magic-numbers */

/** Max Channel Divinity uses for a Paladin at given class level. */
export function paladinChannelDivinityMax(paladinLevel: number): number {
  if (paladinLevel < 3) return 0;
  if (paladinLevel < 11) return 2;
  return 3;
}

/** Expend one Channel Divinity use. Returns unchanged charges if at 0. */
export function expendChannelDivinity(charges: number): number {
  return charges <= 0 ? charges : charges - 1;
}

/** Restore Channel Divinity on short rest: regain 1 use, capped at max. */
export function restoreChannelDivinityShort(
  charges: number,
  max: number,
): number {
  return charges >= max ? charges : charges + 1;
}

/* eslint-enable no-magic-numbers */

// --- Aura of Courage (Level 10) ---

export const AURA_OF_COURAGE_LEVEL = 10;

export function canUseAuraOfCourage(
  paladinLevel: number,
  isConscious: boolean,
): boolean {
  return paladinLevel >= AURA_OF_COURAGE_LEVEL && isConscious;
}

export function auraOfCourageRange(paladinLevel: number): number {
  if (paladinLevel < AURA_OF_COURAGE_LEVEL) return 0;
  if (paladinLevel >= AURA_EXPANSION_LEVEL) return 30;
  return 10;
}

// --- Restoring Touch (Level 14) ---

export function canUseRestoringTouch(
  paladinLevel: number,
  layOnHandsPool: number,
): boolean {
  return paladinLevel >= RESTORING_TOUCH_LEVEL && layOnHandsPool >= CURE_COST;
}

// --- Combined long rest ---

export interface PaladinLongRestResult {
  readonly layOnHandsPool: number;
  readonly paladinSmiteFreeUseAvailable: true;
  readonly faithfulSteedUsed: false;
}

export function paladinLongRest(paladinLevel: number): PaladinLongRestResult {
  return {
    layOnHandsPool: layOnHandsPoolMax(paladinLevel),
    paladinSmiteFreeUseAvailable: true,
    faithfulSteedUsed: false,
  };
}

// =============================================================================
// Oath of Devotion Subclass (SRD 5.2.1)
//
// The only Paladin subclass in the SRD 5.2.1.
// TS-only: aura effects are multi-creature, toggle state is caller-tracked,
// attack modifiers are caller-provided context.
// =============================================================================

const OATH_OF_DEVOTION_LEVEL = 3;
const AURA_OF_DEVOTION_LEVEL = 7;
const SMITE_OF_PROTECTION_LEVEL = 15;
const HOLY_NIMBUS_LEVEL = 20;
const HALF_COVER_AC_BONUS = 2;
const HOLY_NIMBUS_RESTORE_SLOT_LEVEL = 5;

// --- Sacred Weapon (L3 Channel Divinity) ---

/**
 * SRD: "expend one use of your Channel Divinity to imbue one Melee weapon...
 * add your Charisma modifier to attack rolls (minimum bonus of +1), each time
 * you hit you cause it to deal its normal damage type or Radiant damage."
 * Duration: 10 minutes. Ends early if you choose or stop carrying the weapon.
 */
export function canUseSacredWeapon(
  paladinLevel: number,
  channelDivinityCharges: number,
): boolean {
  return paladinLevel >= OATH_OF_DEVOTION_LEVEL && channelDivinityCharges > 0;
}

/** Attack bonus while Sacred Weapon is active: +CHA mod (minimum +1). */
export function sacredWeaponAttackBonus(chaMod: number): number {
  return Math.max(1, chaMod);
}

// --- Aura of Devotion (L7) ---

/**
 * SRD: "You and your allies have Immunity to the Charmed condition while in
 * your Aura of Protection."
 * Range: same as Aura of Protection (10ft at L6, 30ft at L18).
 */
export function hasAuraOfDevotion(paladinLevel: number): boolean {
  return paladinLevel >= AURA_OF_DEVOTION_LEVEL;
}

/** Charmed immunity active when Paladin is conscious and L7+. */
export function auraOfDevotionGrantsCharmedImmunity(
  paladinLevel: number,
  isConscious: boolean,
): boolean {
  return paladinLevel >= AURA_OF_DEVOTION_LEVEL && isConscious;
}

// --- Smite of Protection (L15) ---

/**
 * SRD: "Whenever you cast Divine Smite, you and your allies have Half Cover
 * while in your Aura of Protection... until the start of your next turn."
 * Replaces Purity of Spirit from 5.1.
 */
export function hasSmiteOfProtection(paladinLevel: number): boolean {
  return paladinLevel >= SMITE_OF_PROTECTION_LEVEL;
}

/** Half Cover bonus: +2 to AC and DEX saving throws. */
export function smiteOfProtectionCoverBonus(): number {
  return HALF_COVER_AC_BONUS;
}

// --- Holy Nimbus (L20) ---

/**
 * SRD: "As a Bonus Action, you can imbue your Aura of Protection with holy
 * power... Once you use this feature, you can't use it again until you finish
 * a Long Rest. You can also restore your use of it by expending a level 5
 * spell slot."
 * Benefits: Holy Ward (advantage on saves vs Fiend/Undead), Radiant Damage
 * (CHA mod + prof bonus to enemies in aura), Sunlight (bright light).
 */
export function canUseHolyNimbus(
  paladinLevel: number,
  holyNimbusUsed: boolean,
  bonusActionAvailable: boolean,
): boolean {
  return (
    paladinLevel >= HOLY_NIMBUS_LEVEL && !holyNimbusUsed && bonusActionAvailable
  );
}

/** Radiant damage dealt to enemies starting their turn in the aura. */
export function holyNimbusRadiantDamage(
  chaMod: number,
  profBonus: number,
): number {
  return chaMod + profBonus;
}

/** Can restore Holy Nimbus by expending a L5 spell slot (if already used). */
export function canRestoreHolyNimbusWithSlot(holyNimbusUsed: boolean): boolean {
  return holyNimbusUsed;
}

/** The spell slot level required to restore Holy Nimbus. */
export function holyNimbusRestoreSlotLevel(): number {
  return HOLY_NIMBUS_RESTORE_SLOT_LEVEL;
}
