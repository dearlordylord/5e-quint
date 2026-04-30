import type { AttackRollResult } from "./runtime-hole-algebra.ts";
import { ATTACK_ROLL_MODES } from "./runtime-hole-algebra.ts";

export function attackRollHits(
  roll: AttackRollResult,
  armorClass: number,
): boolean {
  if (Number(roll.naturalD20) === 1) {
    return false;
  }

  if (Number(roll.naturalD20) === 20) {
    return true;
  }

  return roll.total >= armorClass;
}

export function attackRollIsCritical(roll: AttackRollResult): boolean {
  return Number(roll.naturalD20) === 20;
}

export function attackRollResultIsValid(roll: AttackRollResult): boolean {
  return (
    Number.isInteger(roll.total) &&
    Number.isInteger(Number(roll.naturalD20)) &&
    Number(roll.naturalD20) >= 1 &&
    Number(roll.naturalD20) <= 20 &&
    (roll.rollMode === undefined || ATTACK_ROLL_MODES.includes(roll.rollMode))
  );
}
