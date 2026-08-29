// MovablePersistentArea movable Cylinder runtime calculations.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOVABLE_PERSISTENT_AREA_MOVABLE_ZONE_LIFECYCLE

import { halfDamageAfterSuccessfulSave } from "./focused-spell-hazard-damage.ts";

export function movablePersistentAreaDamageAfterSave(input: {
  readonly rolledDamage: number;
  readonly savingThrowSucceeded: boolean;
}): number {
  return halfDamageAfterSuccessfulSave(input);
}

export function movablePersistentAreaMoveDistanceAccepted(input: {
  readonly moveFeet: number;
  readonly maxMoveFeet: number;
}): boolean {
  return (
    Number.isInteger(input.moveFeet) &&
    input.moveFeet > 0 &&
    input.moveFeet <= input.maxMoveFeet
  );
}
