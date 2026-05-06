// Conjuration spells — SRD 5.2.1
// Spells that summon creatures, objects, or transport.

import type {
  ConditionSpellInfo,
  ConditionSpellResult,
  DiceDamage,
  SpellDamageInfo,
} from "#/features/spell-patterns.ts";
import { saveOrCondition, scalingDice } from "#/features/spell-patterns.ts";

/* eslint-disable no-magic-numbers */

// --- Constants ---

/** Goodberry: 10 berries, each heals 1 HP. */
export const GOODBERRY_COUNT = 10;
export const GOODBERRY_HEAL_PER_BERRY = 1;

/** Ice Knife impact: 1d10 Piercing. */
export const ICE_KNIFE_IMPACT: DiceDamage = { dice: 1, dieSize: 10 };

// --- Spell Metadata ---

export const SPELL_SPIRIT_GUARDIANS: SpellDamageInfo = {
  name: "Spirit Guardians",
  level: 3,
  damageType: "radiant",
  pattern: "saveForHalf",
  concentration: true,
  saveAbility: "wis",
};

export const ENTANGLE_INFO: ConditionSpellInfo = {
  name: "Entangle",
  level: 1,
  concentration: true,
  saveAbility: "str",
  conditionApplied: "restrained",
  durationDescription: "Concentration, up to 1 minute",
};

export const WEB_INFO: ConditionSpellInfo = {
  name: "Web",
  level: 2,
  concentration: true,
  saveAbility: "dex",
  conditionApplied: "restrained",
  durationDescription: "Concentration, up to 1 hour",
};

// --- Spirit Guardians ---

/** Spirit Guardians (SRD 5.2.1): 3d8 at L3, +1d8 per slot level above 3. */
export function spiritGuardiansDamage(slotLevel: number): DiceDamage {
  return scalingDice(3, 3, 8, slotLevel);
}

// --- Entangle / Web (both apply Restrained on failed save) ---

/** Result of Entangle on a single target. */
export function entangleResult(savePassed: boolean): ConditionSpellResult {
  return saveOrCondition(savePassed, "restrained");
}

/** Result of Web on a single target (same mechanic as Entangle). */
export const webResult: (savePassed: boolean) => ConditionSpellResult =
  entangleResult;

// --- Ice Knife ---

/** Ice Knife explosion (SRD 5.2.1): 2d6 Cold at L1, +1d6 per slot above 1. */
export function iceKnifeExplosionDamage(slotLevel: number): DiceDamage {
  return scalingDice(2, 1, 6, slotLevel);
}

// --- Call Lightning (L3, Action, 120 ft, Concentration 10 min, DEX save) ---

/** Call Lightning (SRD 5.2.1): 3d10 Lightning at L3, +1d10 per slot above 3. +1d10 if outdoors in storm. */
export function callLightningDamage(
  slotLevel: number,
  outdoorsInStorm: boolean,
): DiceDamage {
  const baseDice = 3 + (slotLevel - 3) + (outdoorsInStorm ? 1 : 0);
  return { dice: baseDice, dieSize: 10 };
}

/* eslint-enable no-magic-numbers */
