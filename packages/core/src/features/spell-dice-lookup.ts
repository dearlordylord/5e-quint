/**
 * Unified spell damage dice lookup — maps snake_case spell names to DiceDamage.
 * Used by the director to derive 3D dice overlays for spell cast events.
 */

import {
  callLightningDamage,
  iceKnifeExplosionDamage,
  spiritGuardiansDamage,
} from "#/features/spell-conjuration.ts";
import { mindSpikeDamage } from "#/features/spell-divination.ts";
import {
  burningHandsDamage,
  chromaticOrbDamage,
  fireballDamage,
  flameBladeDamage,
  guidingBoltDamage,
  moonbeamDamage,
  searingSmiteDamage,
  spiritualWeaponDamage,
  vitriolicSphereInitialDamage,
} from "#/features/spell-evocation.ts";
import { phantasmalKillerDamage } from "#/features/spell-illusion.ts";
import {
  inflictWoundsDamage,
  vampiricTouchDamage,
} from "#/features/spell-necromancy.ts";
import type { DiceDamage } from "#/features/spell-patterns.ts";
import {
  heatMetalDamage,
  shiningSmiteDamage,
} from "#/features/spell-transmutation.ts";

/**
 * Look up damage dice for a spell by snake_case name and slot level.
 * Returns null for non-damaging spells or unknown spells.
 */
export function getSpellDamageDice(
  spellName: string,
  slotLvl: number,
): DiceDamage | null {
  if (slotLvl < 1) return null;

  switch (spellName) {
    // Evocation
    case "fireball":
      return fireballDamage(slotLvl);
    case "burning_hands":
      return burningHandsDamage(slotLvl);
    case "guiding_bolt":
      return guidingBoltDamage(slotLvl);
    case "chromatic_orb":
      return chromaticOrbDamage(slotLvl);
    case "spiritual_weapon":
      return spiritualWeaponDamage(slotLvl);
    case "searing_smite":
      return searingSmiteDamage(slotLvl);
    case "moonbeam":
      return moonbeamDamage(slotLvl);
    case "flame_blade":
      return flameBladeDamage(slotLvl);
    case "vitriolic_sphere":
      return vitriolicSphereInitialDamage(slotLvl);
    // Conjuration
    case "spirit_guardians":
      return spiritGuardiansDamage(slotLvl);
    case "ice_knife":
      return iceKnifeExplosionDamage(slotLvl);
    case "call_lightning":
      return callLightningDamage(slotLvl, false);
    // Necromancy
    case "inflict_wounds":
      return inflictWoundsDamage(slotLvl);
    case "vampiric_touch":
      return vampiricTouchDamage(slotLvl);
    // Illusion
    case "phantasmal_killer":
      return phantasmalKillerDamage(slotLvl);
    // Divination
    case "mind_spike":
      return mindSpikeDamage(slotLvl);
    // Transmutation
    case "heat_metal":
      return heatMetalDamage(slotLvl);
    case "shining_smite":
      return shiningSmiteDamage(slotLvl);
    default:
      return null;
  }
}
