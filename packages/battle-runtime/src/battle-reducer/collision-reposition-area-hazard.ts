// ram-movable persistent area hazard and ram runtime calculations.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAM_MOVABLE_PERSISTENT_AREA_HAZARD_LIFECYCLE

import { halfDamageAfterSuccessfulSave } from "./focused-spell-hazard-damage.ts";

export function ramMovablePersistentAreaDamageAfterSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return halfDamageAfterSuccessfulSave(input);
}

export function ramMovablePersistentAreaMoveDistanceAccepted(input: {
  readonly moveFeet: number;
  readonly maxMoveFeet: number;
}): boolean {
  return (
    Number.isInteger(input.moveFeet) &&
    input.moveFeet > 0 &&
    input.moveFeet <= input.maxMoveFeet
  );
}
