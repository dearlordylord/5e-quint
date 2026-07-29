// Flaming Sphere hazard and ram runtime calculations.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE

import { halfDamageAfterSuccessfulSave } from "./focused-spell-hazard-damage.ts";

export function flamingSphereDamageAfterSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return halfDamageAfterSuccessfulSave(input);
}

export function flamingSphereMoveDistanceAccepted(input: {
  readonly moveFeet: number;
  readonly maxMoveFeet: number;
}): boolean {
  return (
    Number.isInteger(input.moveFeet) &&
    input.moveFeet > 0 &&
    input.moveFeet <= input.maxMoveFeet
  );
}
